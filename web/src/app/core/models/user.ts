/** Mirrors docs/API.md §10 and §12. */

export const ROLES = ['GENERAL', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** The API's role codes never appear on screen (§25). */
export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  GENERAL: 'General User',
  ADMIN: 'Admin',
};

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
}
