import { z } from 'zod';
import { PASSWORD_MAX_LENGTH } from '../domain/limits.js';
import { ROLES, USER_ID_PATTERN } from '../domain/user.js';

/**
 * POST /auth/login (docs/API.md §10). The userId is trimmed and lower-cased before lookup.
 * The password policy applies when a password is set, not here, so any stored password can
 * still be checked. Unknown keys are refused.
 */
export const loginBody = z.strictObject({
  userId: z
    .string({ error: 'userId is required' })
    .trim()
    .toLowerCase()
    .regex(
      USER_ID_PATTERN,
      'userId must be 3 to 32 lower-case letters, digits, dots, underscores or hyphens',
    ),
  password: z
    .string({ error: 'password is required' })
    .min(1, 'password is required')
    .max(PASSWORD_MAX_LENGTH, `password must be at most ${String(PASSWORD_MAX_LENGTH)} characters`),
  role: z.enum(ROLES, { error: 'role must be GENERAL or ADMIN' }),
});
