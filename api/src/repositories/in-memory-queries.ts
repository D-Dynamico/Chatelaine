import type { Page, PageRequest, SortOrder } from '../domain/paging.js';
import {
  ACCESS_LEVELS,
  PRIORITIES,
  PRIORITY_RANK,
  REQUEST_STATUSES,
  STATUS_RANK,
  type RecordCounts,
  type RecordListQuery,
  type RecordScope,
  type RecordSortField,
  type ServiceRequest,
} from '../domain/service-request.js';

/**
 * Filtering, sorting and paging for adapters that work on loaded items: the XML file, and
 * DynamoDB after its key query (D7). Ordering matches MongoDB's defaults, so every adapter
 * returns the same page: strings compare by code unit, and null sorts before any value.
 */

export type SortValue = string | number | null;

export function compareSortValues(a: SortValue, b: SortValue): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a < b ? -1 : 1;
}

/**
 * Sorts by one key, breaking ties by a unique key in the same direction, so paging is
 * stable and identical across adapters. Pages past the end are empty, total unchanged.
 */
export function sortAndPage<T>(
  items: readonly T[],
  sortKey: (item: T) => SortValue,
  uniqueKey: (item: T) => string,
  order: SortOrder,
  { page, pageSize }: PageRequest,
): Page<T> {
  const direction = order === 'asc' ? 1 : -1;
  const sorted = [...items].sort(
    (a, b) =>
      direction *
      (compareSortValues(sortKey(a), sortKey(b)) || compareSortValues(uniqueKey(a), uniqueKey(b))),
  );
  const start = (page - 1) * pageSize;
  return { items: sorted.slice(start, start + pageSize), page, pageSize, total: sorted.length };
}

export function containsText(needle: string, ...haystacks: readonly string[]): boolean {
  const lowered = needle.toLowerCase();
  return haystacks.some((value) => value.toLowerCase().includes(lowered));
}

export function inRecordScope(item: ServiceRequest, scope: RecordScope): boolean {
  return (
    (scope.ownerId === undefined || item.ownerId === scope.ownerId) &&
    (scope.accessLevel === undefined || item.accessLevel === scope.accessLevel)
  );
}

function matchesRecordQuery(item: ServiceRequest, query: RecordListQuery): boolean {
  return (
    (query.status === undefined || item.status === query.status) &&
    (query.priority === undefined || item.priority === query.priority) &&
    (query.accessLevel === undefined || item.accessLevel === query.accessLevel) &&
    (query.q === undefined || containsText(query.q, item.id, item.title))
  );
}

const RECORD_SORT_KEYS: Readonly<Record<RecordSortField, (item: ServiceRequest) => SortValue>> = {
  createdAt: (item) => item.createdAt,
  updatedAt: (item) => item.updatedAt,
  priority: (item) => PRIORITY_RANK[item.priority],
  status: (item) => STATUS_RANK[item.status],
  title: (item) => item.title,
};

export function queryRecords(
  items: readonly ServiceRequest[],
  scope: RecordScope,
  query: RecordListQuery,
): Page<ServiceRequest> {
  const matching = items.filter(
    (item) => inRecordScope(item, scope) && matchesRecordQuery(item, query),
  );
  return sortAndPage(matching, RECORD_SORT_KEYS[query.sort], (item) => item.id, query.order, query);
}

function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  // Safe: every key of K is in keys, and each one is set.
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

export function emptyRecordCounts(): RecordCounts {
  return {
    total: 0,
    byStatus: zeroCounts(REQUEST_STATUSES),
    byPriority: zeroCounts(PRIORITIES),
    byAccessLevel: zeroCounts(ACCESS_LEVELS),
  };
}

export function countRecords(items: readonly ServiceRequest[]): RecordCounts {
  const counts = emptyRecordCounts();
  for (const item of items) {
    counts.byStatus[item.status] += 1;
    counts.byPriority[item.priority] += 1;
    counts.byAccessLevel[item.accessLevel] += 1;
  }
  return { ...counts, total: items.length };
}
