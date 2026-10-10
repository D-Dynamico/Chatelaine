/** Mirrors docs/API.md §10 and §12. */

import { type SortOrder } from './paging';

export const ROLES = ['GENERAL', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** The API's role codes never appear on screen (§25). */
export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  GENERAL: 'General User',
  ADMIN: 'Admin',
};

export const USER_STATUS_LABELS: Readonly<Record<UserStatus, string>> = {
  ACTIVE: 'Active',
  DISABLED: 'Disabled',
};

export const USER_SORT_FIELDS = [
  'userId',
  'displayName',
  'role',
  'status',
  'createdAt',
  'lastLoginAt',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/** The API's rules for a user's fields (§12), so the form refuses what the API would. */
export const USER_RULES = {
  userIdPattern: /^[a-z0-9._-]{3,32}$/,
  displayNameMax: 60,
  emailMax: 254,
  departmentMax: 40,
  passwordMin: 8,
  passwordMax: 128,
} as const;

export interface UserView {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly department: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastLoginAt: string | null;
  /** The sign-in before `lastLoginAt`: what "last signed in" means to the user (§10). */
  readonly previousLoginAt: string | null;
}

/** `GET /admin/users/:userId`: the user plus how many service requests they own. */
export interface UserDetail extends UserView {
  readonly recordCount: number;
}

export interface UserListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: UserSortField;
  readonly order: SortOrder;
  readonly role?: Role;
  readonly status?: UserStatus;
  readonly q?: string;
}

/** `POST /admin/users`. New users always start active. */
export interface NewUser {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string;
  readonly department: string;
  readonly role: Role;
  readonly password: string;
}

/** `PATCH /admin/users/:userId`: any subset, at least one field; userId never changes. */
export type UserChanges = Partial<Omit<NewUser, 'userId'> & { readonly status: UserStatus }>;
