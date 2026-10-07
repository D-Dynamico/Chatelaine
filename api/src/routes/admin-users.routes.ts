import { Router } from 'express';
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from '../controllers/admin-users.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import {
  createUserBody,
  patchUserBody,
  userIdParam,
  usersQuery,
} from '../schemas/admin-users.schema.js';
import type { AuthService } from '../services/auth.service.js';
import type { UserService } from '../services/user.service.js';

/**
 * Mounted at /admin/users. The session and role checks guard the whole router and run
 * before any validation, so a General User gets 403 whatever they send and learns nothing
 * about the shape these endpoints expect (docs/API.md §12).
 */
export function adminUsersRoutes(auth: AuthService, users: UserService): Router {
  const router = Router();
  router.use(authenticate(auth), requireRole('ADMIN'));
  router.get('/', validate('query', usersQuery), listUsersController(users));
  router.post('/', validate('body', createUserBody), createUserController(users));
  router.get('/:userId', validate('params', userIdParam), getUserController(users));
  router.patch(
    '/:userId',
    validate('params', userIdParam),
    validate('body', patchUserBody),
    updateUserController(users),
  );
  router.delete('/:userId', validate('params', userIdParam), deleteUserController(users));
  return router;
}
