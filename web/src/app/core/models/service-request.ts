/** Mirrors docs/API.md §11 and docs/ARCHITECTURE.md §5. */

export const CATEGORIES = ['HARDWARE', 'SOFTWARE', 'ACCESS', 'NETWORK', 'FACILITIES'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ACCESS_LEVELS = ['GENERAL', 'ADMIN'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const RECORD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'priority',
  'status',
  'title',
] as const;
export type RecordSortField = (typeof RECORD_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Codes never appear on screen (§25); these are the words that do. */
export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  ACCESS: 'Access',
  NETWORK: 'Network',
  FACILITIES: 'Facilities',
};

export const PRIORITY_LABELS: Readonly<Record<Priority, string>> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const STATUS_LABELS: Readonly<Record<RequestStatus, string>> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const ACCESS_LEVEL_LABELS: Readonly<Record<AccessLevel, string>> = {
  GENERAL: 'General',
  ADMIN: 'Admin',
};

/** What a General User receives: the restricted keys are absent, not null (§5). */
export interface RecordItem {
  readonly id: string;
  readonly title: string;
  readonly category: Category;
  readonly priority: Priority;
  readonly status: RequestStatus;
  readonly accessLevel: AccessLevel;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** What an Admin receives. */
export interface AdminRecordItem extends RecordItem {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly assignee: string | null;
  readonly internalNote: string | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface RecordQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: RecordSortField;
  readonly order: SortOrder;
  readonly status?: RequestStatus;
  readonly priority?: Priority;
  /** Admins only: the API refuses it from a General User with 403 (§11). */
  readonly accessLevel?: AccessLevel;
  readonly q?: string;
}

export interface RecordSummary {
  readonly scope: 'OWN' | 'ALL';
  readonly total: number;
  readonly byStatus: Readonly<Record<RequestStatus, number>>;
  readonly byPriority: Readonly<Record<Priority, number>>;
  /** A General User's summary has no `ADMIN` key at all (§11). */
  readonly byAccessLevel: Readonly<Partial<Record<AccessLevel, number>>>;
}
