import type { PageRequest, SortOrder } from './paging.js';

/** Service requests, the app's "records" (docs/ARCHITECTURE.md §5, D28). */

export const CATEGORIES = ['HARDWARE', 'SOFTWARE', 'ACCESS', 'NETWORK', 'FACILITIES'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const REQUEST_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ACCESS_LEVELS = ['GENERAL', 'ADMIN'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/**
 * Sorting follows meaning, not the alphabet: CRITICAL is the most severe (D14), and status
 * follows the workflow from OPEN to CLOSED. Adapters store these ranks so the sort can run
 * in the query.
 */
export const PRIORITY_RANK: Readonly<Record<Priority, number>> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};
export const STATUS_RANK: Readonly<Record<RequestStatus, number>> = {
  OPEN: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  CLOSED: 4,
};

export interface ServiceRequest {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly category: Category;
  readonly priority: Priority;
  readonly status: RequestStatus;
  readonly accessLevel: AccessLevel;
  readonly assignee: string | null;
  readonly internalNote: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Which requests a caller may see at all. Set by RecordService from the caller's role and
 * applied by the repository inside the query, never by filtering after loading.
 */
export interface RecordScope {
  readonly ownerId?: string;
  readonly accessLevel?: AccessLevel;
}

export const RECORD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'priority',
  'status',
  'title',
] as const;
export type RecordSortField = (typeof RECORD_SORT_FIELDS)[number];

/** Filters the caller chose, applied on top of the scope (they can only narrow it). */
export interface RecordListQuery extends PageRequest {
  readonly status?: RequestStatus;
  readonly priority?: Priority;
  readonly accessLevel?: AccessLevel;
  /** Case-insensitive substring of the id or title. */
  readonly q?: string;
  readonly sort: RecordSortField;
  readonly order: SortOrder;
}

export interface RecordCounts {
  readonly total: number;
  readonly byStatus: Record<RequestStatus, number>;
  readonly byPriority: Record<Priority, number>;
  readonly byAccessLevel: Record<AccessLevel, number>;
}
