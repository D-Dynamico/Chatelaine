/** Users and their roles (docs/ARCHITECTURE.md §5). */

export const ROLES = ['GENERAL', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

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
