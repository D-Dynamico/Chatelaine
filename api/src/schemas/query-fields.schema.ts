import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORT_ORDERS } from '../domain/paging.js';

/** Building blocks for list queries. Messages name the field, since they reach the UI. */

/** An enum query value, with a message that lists what is allowed. */
export function oneOf<const T extends readonly [string, ...string[]]>(field: string, values: T) {
  return z.enum(values, { error: `${field} must be one of ${values.join(', ')}` });
}

/** A whole number from a query string. Digits only, so "1.5", "-1" and "" are refused. */
function wholeNumber(field: string, min: number, max: number) {
  const message = `${field} must be a whole number from ${String(min)} to ${String(max)}`;
  return z
    .string({ error: message })
    .regex(/^\d{1,6}$/, message)
    .transform(Number)
    .pipe(z.number().min(min, message).max(max, message));
}

const MAX_PAGE = 100_000;
const MAX_SEARCH_LENGTH = 60;

export const pagingFields = {
  page: wholeNumber('page', 1, MAX_PAGE).default(1),
  pageSize: wholeNumber('pageSize', 1, MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export function orderField(defaultOrder: (typeof SORT_ORDERS)[number]) {
  return oneOf('order', SORT_ORDERS).default(defaultOrder);
}

export const searchField = z
  .string({ error: 'q must be text' })
  .trim()
  .min(1, 'q must not be empty')
  .max(MAX_SEARCH_LENGTH, `q must be at most ${String(MAX_SEARCH_LENGTH)} characters`)
  .optional();
