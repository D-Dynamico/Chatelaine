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
 * Builds the response shape field by field. A spread would copy whatever extra keys an
 * object happened to carry; this cannot, so no hash can leave through a response.
 */
export function toUserView(user: User): UserView {
  return {
    userId: user.userId,
    displayName: user.displayName,
    email: user.email,
    department: user.department,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
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
