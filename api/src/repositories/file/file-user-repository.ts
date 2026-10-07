import { ConflictError, NotFoundError } from '../../domain/errors.js';
import type { NewUser, User, UserCredentials, UserPatch } from '../../domain/user.js';
import type { UserRepository } from '../contracts.js';
import type { XmlDocument } from './xml-document.js';

/** What a file repository needs from the store: a copy to read, and a safe way to change it. */
export interface DocumentAccess {
  read(): XmlDocument;
  mutate<T>(change: (draft: XmlDocument) => T): Promise<T>;
}

/** Copies fields one by one, so a stored hash can never ride along into a User. */
function toUser(stored: NewUser): User {
  return {
    userId: stored.userId,
    displayName: stored.displayName,
    email: stored.email,
    department: stored.department,
    role: stored.role,
    status: stored.status,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    lastLoginAt: stored.lastLoginAt,
  };
}

function userNotFound(userId: string): NotFoundError {
  return new NotFoundError('USER_NOT_FOUND', `No user has the ID "${userId}".`);
}

function locate(draft: XmlDocument, userId: string): { index: number; stored: NewUser } {
  const index = draft.users.findIndex((user) => user.userId === userId);
  const stored = draft.users[index];
  if (!stored) throw userNotFound(userId);
  return { index, stored };
}

export class FileUserRepository implements UserRepository {
  constructor(private readonly store: DocumentAccess) {}

  findById(userId: string): Promise<User | null> {
    const stored = this.find(userId);
    return Promise.resolve(stored ? toUser(stored) : null);
  }

  findCredentials(userId: string): Promise<UserCredentials | null> {
    const stored = this.find(userId);
    return Promise.resolve(
      stored ? { user: toUser(stored), passwordHash: stored.passwordHash } : null,
    );
  }

  create(input: NewUser): Promise<User> {
    return this.store.mutate((draft) => {
      if (draft.users.some((user) => user.userId === input.userId)) {
        throw new ConflictError('USER_EXISTS', `The user ID "${input.userId}" is already taken.`);
      }
      const stored: NewUser = { ...input };
      draft.users.push(stored);
      return toUser(stored);
    });
  }

  update(userId: string, patch: UserPatch): Promise<User> {
    return this.store.mutate((draft) => {
      const { index, stored } = locate(draft, userId);
      const updated: NewUser = { ...stored, ...patch };
      draft.users[index] = updated;
      return toUser(updated);
    });
  }

  async delete(userId: string): Promise<void> {
    await this.store.mutate((draft) => {
      draft.users.splice(locate(draft, userId).index, 1);
    });
  }

  async touchLastLogin(userId: string, at: string): Promise<void> {
    await this.store.mutate((draft) => {
      const { index, stored } = locate(draft, userId);
      draft.users[index] = { ...stored, lastLoginAt: at };
    });
  }

  private find(userId: string): NewUser | undefined {
    return this.store.read().users.find((user) => user.userId === userId);
  }
}
