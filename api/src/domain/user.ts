import type { PageRequest, SortOrder } from './paging.js';

/** Users and their roles (docs/ARCHITECTURE.md §5). */

export const ROLES = ['GENERAL', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** 3 to 32 characters of lower-case letters, digits, dots, underscores and hyphens. */
export const USER_ID_PATTERN = /^[a-z0-9._-]{3,32}$/;

export const USER_SORT_FIELDS = [
  'userId',
  'displayName',
  'role',
  'status',
  'createdAt',
  'lastLoginAt',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

export interface UserListQuery extends PageRequest {
  readonly role?: Role;
  readonly status?: UserStatus;
  /** Case-insensitive substring of the userId, display name or email. */
  readonly q?: string;
  readonly sort: UserSortField;
  readonly order: SortOrder;
}

/** A user as the rest of the app sees it. The password hash is never part of this type. */
export interface User {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly department: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt: string | null;
}

/** The user as the API returns it (docs/API.md §10). Same fields as User, by design. */
export type UserView = User;

/**
 * Copies exactly the User fields, one by one. A spread would carry whatever extra keys an
 * object happened to have (a password hash, a database _id); this cannot. Every adapter
 * returns users through it, and toUserView builds on it.
 */
export function toUser(source: User): User {
  return {
    userId: source.userId,
    displayName: source.displayName,
    email: source.email,
    department: source.department,
    role: source.role,
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    lastLoginAt: source.lastLoginAt,
  };
}

export function toUserView(user: User): UserView {
  return toUser(user);
}

/** What a repository stores for a new user. Timestamps are set by the caller's clock. */
export interface NewUser extends User {
  readonly passwordHash: string;
}

/** Only login needs the hash, so it comes back through its own method and type. */
export interface UserCredentials {
  readonly user: User;
  readonly passwordHash: string;
}

export interface UserPatch {
  readonly displayName?: string;
  readonly email?: string;
  readonly department?: string;
  readonly role?: Role;
  readonly status?: UserStatus;
  readonly passwordHash?: string;
  readonly updatedAt: string;
}

/** What an admin sends to create a user; the service hashes the password and stamps times. */
export interface CreateUserInput {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly department: string;
  readonly role: Role;
  readonly password: string;
}

/** What an admin may change on an existing user. userId is never among them. */
export interface UserChanges {
  readonly displayName?: string;
  readonly email?: string;
  readonly department?: string;
  readonly role?: Role;
  readonly status?: UserStatus;
  readonly password?: string;
}
