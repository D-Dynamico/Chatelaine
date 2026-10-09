import {
  ROLE_LABELS,
  type Role,
  USER_STATUS_LABELS,
  type UserStatus,
} from '../../core/models/user';
import { type AccessTone } from '../../shared/ui/role-badge';

/** How the admin screens show user codes: words, icons and the role's key-tag tone. */

const USER_STATUS_ICONS: Readonly<Record<UserStatus, string>> = {
  ACTIVE: 'check_circle',
  DISABLED: 'block',
};

export function roleDisplay(role: Role): { label: string; tone: AccessTone } {
  return { label: ROLE_LABELS[role], tone: role === 'ADMIN' ? 'admin' : 'general' };
}

export function userStatusDisplay(status: UserStatus): { label: string; icon: string } {
  return { label: USER_STATUS_LABELS[status], icon: USER_STATUS_ICONS[status] };
}

/**
 * Why the signed-in admin's own row cannot do these (§20). The API refuses each with
 * `SELF_ACTION` (§12); the UI says so before anyone tries.
 */
export const SELF_ACTION_REASONS = {
  delete: "You can't delete your own account.",
  disable: "You can't disable your own account.",
  role: "You can't change your own role.",
  status: "You can't change your own status.",
} as const;
