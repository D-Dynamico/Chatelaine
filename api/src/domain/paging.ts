/** Offset paging with a total, so the table can say "1 to 10 of 18" (D13). */

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface Page<T> {
  readonly items: T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
