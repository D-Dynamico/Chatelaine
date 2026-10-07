import type { Page } from '../domain/paging.js';
import type {
  RecordCounts,
  RecordListQuery,
  RecordScope,
  ServiceRequest,
} from '../domain/service-request.js';
import type {
  NewUser,
  User,
  UserCredentials,
  UserListQuery,
  UserPatch,
  UserStatus,
} from '../domain/user.js';

/**
 * The only storage interface services know about (docs/ARCHITECTURE.md §6). Every adapter
 * passes the same contract suites in test/contract.
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
  /** Filters, sorts and pages; ties break on userId. Never returns hashes. */
  list(query: UserListQuery): Promise<Page<User>>;
  /** Admins in total, or only those with the given status. */
  countAdmins(filter: { status?: UserStatus }): Promise<number>;
}

export interface RecordRepository {
  /** Applies the scope and the query's filters in storage, then sorts and pages. */
  list(scope: RecordScope, query: RecordListQuery): Promise<Page<ServiceRequest>>;
  /** Counts over the scope, with every enum value present (zero when absent). */
  summary(scope: RecordScope): Promise<RecordCounts>;
  countByOwner(ownerId: string): Promise<number>;
  /** Returns how many requests were deleted. */
  deleteByOwner(ownerId: string): Promise<number>;
  /** Seed only. */
  insertMany(items: readonly ServiceRequest[]): Promise<void>;
}

export interface Store {
  readonly users: UserRepository;
  readonly records: RecordRepository;
  /** Creates the file, indexes or table if missing. Safe to call on existing data. */
  init(): Promise<void>;
  /** Empties every collection. Used by the seed and the contract tests. */
  reset(): Promise<void>;
  close(): Promise<void>;
}
