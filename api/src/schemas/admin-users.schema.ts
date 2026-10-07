import { z } from 'zod';
import { ROLES, USER_ID_PATTERN, USER_SORT_FIELDS, USER_STATUSES } from '../domain/user.js';
import { oneOf, orderField, pagingFields, searchField } from './query-fields.schema.js';

const USER_ID_MESSAGE =
  'userId must be 3 to 32 lower-case letters, digits, dots, underscores or hyphens';

/** GET /admin/users (docs/API.md §12). */
export const usersQuery = z.object({
  ...pagingFields,
  sort: oneOf('sort', USER_SORT_FIELDS).default('userId'),
  order: orderField('asc'),
  role: oneOf('role', ROLES).optional(),
  status: oneOf('status', USER_STATUSES).optional(),
  q: searchField,
});

/** The :userId path parameter on every single-user admin route. */
export const userIdParam = z.object({
  userId: z.string().regex(USER_ID_PATTERN, USER_ID_MESSAGE),
});
