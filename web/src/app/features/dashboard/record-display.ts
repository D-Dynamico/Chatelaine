import {
  ACCESS_LEVEL_LABELS,
  type AccessLevel,
  PRIORITY_LABELS,
  type Priority,
  REQUEST_STATUSES,
  STATUS_LABELS,
  type RequestStatus,
} from '../../core/models/service-request';
import { type AccessTone } from '../../shared/ui/role-badge';

/** How the dashboard shows codes: words, icons, severity levels and access tones. */

export const STATUS_ICONS: Readonly<Record<RequestStatus, string>> = {
  OPEN: 'radio_button_unchecked',
  IN_PROGRESS: 'pending',
  RESOLVED: 'check_circle',
  CLOSED: 'archive',
};

export const PRIORITY_LEVELS: Readonly<Record<Priority, number>> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/** A role and an access level share their codes, so one mapping serves both. */
export function accessTone(level: AccessLevel): AccessTone {
  return level === 'ADMIN' ? 'admin' : 'general';
}

export function statusDisplay(status: RequestStatus) {
  return { label: STATUS_LABELS[status], icon: STATUS_ICONS[status] };
}

export function priorityDisplay(priority: Priority) {
  return { label: PRIORITY_LABELS[priority], level: PRIORITY_LEVELS[priority] };
}

export function accessDisplay(level: AccessLevel) {
  return { label: ACCESS_LEVEL_LABELS[level], tone: accessTone(level) };
}

/** Workflow order, for the summary bar and its legend. */
export const STATUS_ORDER = REQUEST_STATUSES;
