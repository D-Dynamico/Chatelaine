import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../domain/limits.js';
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

const PASSWORD_MESSAGE = `password must be ${String(PASSWORD_MIN_LENGTH)} to ${String(PASSWORD_MAX_LENGTH)} characters with at least one letter and one digit`;

/** Profile fields shared by create and edit. Text is trimmed before its length is checked. */
const profileFields = {
  displayName: z
    .string({ error: 'displayName is required' })
    .trim()
    .min(1, 'displayName is required')
    .max(60, 'displayName must be at most 60 characters'),
  email: z
    .string({ error: 'email is required' })
    .trim()
    .pipe(z.email({ error: 'email must be a valid email address' }).max(254)),
  department: z
    .string({ error: 'department is required' })
    .trim()
    .min(1, 'department is required')
    .max(40, 'department must be at most 40 characters'),
  role: oneOf('role', ROLES),
  password: z
    .string({ error: 'password is required' })
    .min(PASSWORD_MIN_LENGTH, PASSWORD_MESSAGE)
    .max(PASSWORD_MAX_LENGTH, PASSWORD_MESSAGE)
    .regex(/[A-Za-z]/, PASSWORD_MESSAGE)
    .regex(/\d/, PASSWORD_MESSAGE),
};

/** POST /admin/users. Unknown keys are refused; new users always start ACTIVE. */
export const createUserBody = z.strictObject({
  userId: z
    .string({ error: 'userId is required' })
    .trim()
    .toLowerCase()
    .regex(USER_ID_PATTERN, USER_ID_MESSAGE),
  ...profileFields,
});

/** PATCH /admin/users/:userId. Any subset, at least one field; userId can never change. */
export const patchUserBody = z
  .strictObject({
    displayName: profileFields.displayName.optional(),
    email: profileFields.email.optional(),
    department: profileFields.department.optional(),
    role: profileFields.role.optional(),
    status: oneOf('status', USER_STATUSES).optional(),
    password: profileFields.password.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, 'send at least one field to change');
