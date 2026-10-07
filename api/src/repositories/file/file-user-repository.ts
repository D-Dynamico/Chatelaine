import { userIdTaken, userNotFound } from '../../domain/errors.js';
import type { Page } from '../../domain/paging.js';
import {
  toUser,
  type NewUser,
  type User,
  type UserCredentials,
  type UserListQuery,
  type UserPatch,
  type UserStatus,
} from '../../domain/user.js';
import type { UserRepository } from '../contracts.js';
import { countAdmins, queryUsers } from '../in-memory-queries.js';
import type { XmlDocument } from './xml-document.js';

/** What a file repository needs from the store: a copy to read, and a safe way to change it. */
export interface DocumentAccess {
  read(): XmlDocument;
  mutate<T>(change: (draft: XmlDocument) => T): Promise<T>;
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
        throw userIdTaken();
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

  list(query: UserListQuery): Promise<Page<User>> {
    return Promise.resolve(queryUsers(this.allUsers(), query));
  }

  countAdmins(filter: { status?: UserStatus }): Promise<number> {
    return Promise.resolve(countAdmins(this.allUsers(), filter));
  }

  private allUsers(): User[] {
    return this.store.read().users.map(toUser);
  }

  private find(userId: string): NewUser | undefined {
    return this.store.read().users.find((user) => user.userId === userId);
  }
}
