import type { NewUser, User, UserCredentials, UserPatch } from '../domain/user.js';

/**
 * The only storage interface services know about (docs/ARCHITECTURE.md §6). Every adapter
 * passes the same contract suite in test/contract. Record methods arrive in Stage 2.
 */
export interface UserRepository {
  findById(userId: string): Promise<User | null>;
  /** The only method that returns a password hash. */
  findCredentials(userId: string): Promise<UserCredentials | null>;
  /** Throws ConflictError(USER_EXISTS) if the userId is taken. */
  create(input: NewUser): Promise<User>;
  /** Throws NotFoundError(USER_NOT_FOUND) if the user does not exist. */
  update(userId: string, patch: UserPatch): Promise<User>;
  /** Throws NotFoundError(USER_NOT_FOUND) if the user does not exist. */
  delete(userId: string): Promise<void>;
  /** Sets lastLoginAt only; updatedAt is about profile changes, not sign-ins. */
  touchLastLogin(userId: string, at: string): Promise<void>;
}

export interface Store {
  readonly users: UserRepository;
  /** Creates the file, indexes or table if missing. Safe to call on existing data. */
  init(): Promise<void>;
  /** Empties every collection. Used by the seed and the contract tests. */
  reset(): Promise<void>;
  close(): Promise<void>;
}
