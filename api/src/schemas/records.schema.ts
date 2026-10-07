import { z } from 'zod';
import {
  ACCESS_LEVELS,
  PRIORITIES,
  RECORD_SORT_FIELDS,
  REQUEST_STATUSES,
} from '../domain/service-request.js';
import { oneOf, orderField, pagingFields, searchField } from './query-fields.schema.js';

/**
 * GET /records (docs/API.md §11). Unknown keys are dropped, not refused, because the same
 * query string also carries delay and fail. A repeated key arrives as an array and fails.
 */
export const recordsQuery = z.object({
  ...pagingFields,
  sort: oneOf('sort', RECORD_SORT_FIELDS).default('createdAt'),
  order: orderField('desc'),
  status: oneOf('status', REQUEST_STATUSES).optional(),
  priority: oneOf('priority', PRIORITIES).optional(),
  accessLevel: oneOf('accessLevel', ACCESS_LEVELS).optional(),
  q: searchField,
});
