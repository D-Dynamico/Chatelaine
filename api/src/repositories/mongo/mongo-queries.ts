import type { Sort } from 'mongodb';
import type { PageRequest, SortOrder } from '../../domain/paging.js';

/**
 * Search text is matched literally, never as a pattern: "reader (east" must find that
 * title, and ".*" must not match everything.
 */
export function literalPattern(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Sorts by one field, breaking ties by a unique field in the same direction. */
export function stableSort(field: string, uniqueField: string, order: SortOrder): Sort {
  const direction = order === 'asc' ? 1 : -1;
  return field === uniqueField
    ? { [field]: direction }
    : { [field]: direction, [uniqueField]: direction };
}

export function pageWindow({ page, pageSize }: PageRequest): { skip: number; limit: number } {
  return { skip: (page - 1) * pageSize, limit: pageSize };
}

/** MongoDB's duplicate key error, raised by a unique index. */
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

/** Leaves out undefined values, which $set would otherwise store as null. */
export function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>;
}
