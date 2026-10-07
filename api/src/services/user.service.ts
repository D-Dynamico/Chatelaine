import { ConflictError, userNotFound } from '../domain/errors.js';
import type { Page } from '../domain/paging.js';
import {
  toUserView,
  type CreateUserInput,
  type Role,
  type User,
  type UserChanges,
  type UserListQuery,
  type UserPatch,
  type UserStatus,
  type UserView,
} from '../domain/user.js';
import type { Clock } from '../lib/clock.js';
import type { RecordRepository, UserRepository } from '../repositories/contracts.js';
import type { PasswordService } from './password.service.js';

/** One user for the admin screens, with how many requests a delete would remove (§20). */
export interface UserDetailView extends UserView {
  readonly recordCount: number;
}

function isActiveAdmin(user: User): boolean {
  return user.role === 'ADMIN' && user.status === 'ACTIVE';
}

/** True only when a value was sent and differs; resending the current value is not a change. */
function changes<T>(sent: T | undefined, current: T): boolean {
  return sent !== undefined && sent !== current;
}

/** Whether the change would leave this user no longer an active admin. */
function removesActiveAdmin(target: User, role?: Role, status?: UserStatus): boolean {
  return (
    isActiveAdmin(target) &&
    ((role ?? target.role) !== 'ADMIN' || (status ?? target.status) !== 'ACTIVE')
  );
}

/**
 * User management for admins (docs/API.md §12). Callers have already passed requireRole;
 * the rules here are the ones a role check cannot express: no admin acts on their own
 * role, status or account (SELF_ACTION), and the last active admin is never removed
 * (LAST_ADMIN, D30). Mutations are pessimistic: the response is the stored result.
 */
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly records: RecordRepository,
    private readonly passwords: PasswordService,
    private readonly clock: Clock,
  ) {}

  async list(query: UserListQuery): Promise<Page<UserView>> {
    const page = await this.users.list(query);
    return { ...page, items: page.items.map(toUserView) };
  }

  async get(userId: string): Promise<UserDetailView> {
    const user = await this.requireUser(userId);
    return { ...toUserView(user), recordCount: await this.records.countByOwner(userId) };
  }

  async create(input: CreateUserInput): Promise<UserView> {
    const now = this.clock.now().toISOString();
    const created = await this.users.create({
      userId: input.userId,
      displayName: input.displayName,
      email: input.email,
      department: input.department,
      role: input.role,
      status: 'ACTIVE',
      passwordHash: await this.passwords.hash(input.password),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
    return toUserView(created);
  }

  async update(actor: User, userId: string, input: UserChanges): Promise<UserView> {
    const target = await this.requireUser(userId);
    const isSelf = actor.userId === target.userId;
    if (isSelf && (changes(input.role, target.role) || changes(input.status, target.status))) {
      throw new ConflictError(
        'SELF_ACTION',
        "You can't change your own role or status. Ask another admin.",
      );
    }
    if (removesActiveAdmin(target, input.role, input.status)) await this.keepAnotherActiveAdmin();

    const { password, ...profile } = input;
    const patch: UserPatch = {
      ...profile,
      ...(password === undefined ? {} : { passwordHash: await this.passwords.hash(password) }),
      updatedAt: this.clock.now().toISOString(),
    };
    return toUserView(await this.users.update(userId, patch));
  }

  /** Deletes the user and their service requests (D15). */
  async delete(actor: User, userId: string): Promise<void> {
    if (actor.userId === userId) {
      throw new ConflictError(
        'SELF_ACTION',
        "You can't delete your own account. Ask another admin.",
      );
    }
    const target = await this.requireUser(userId);
    if (isActiveAdmin(target)) await this.keepAnotherActiveAdmin();
    await this.records.deleteByOwner(userId);
    await this.users.delete(userId);
  }

  /**
   * Called only when the target is an active admin about to stop being one, so the count
   * includes the target and must be above one. Through the API, the caller is always another
   * active admin, so this cannot trigger in a single request; it guards concurrent
   * cross-demotion and callerless paths, and is unit-tested directly (D30).
   */
  private async keepAnotherActiveAdmin(): Promise<void> {
    if ((await this.users.countAdmins({ status: 'ACTIVE' })) <= 1) {
      throw new ConflictError('LAST_ADMIN', 'At least one active admin must remain.');
    }
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw userNotFound(userId);
    return user;
  }
}
