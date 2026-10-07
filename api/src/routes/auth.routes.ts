import { Router } from 'express';
import { loginController } from '../controllers/auth.controller.js';
import { loginRateLimit } from '../middleware/login-rate-limit.js';
import { validate } from '../middleware/validate.js';
import { loginBody } from '../schemas/auth.schema.js';
import type { AuthService } from '../services/auth.service.js';

/** The rate limit runs before validation, so malformed attempts count too. */
export function authRoutes(auth: AuthService): Router {
  return Router().post(
    '/auth/login',
    loginRateLimit(),
    validate('body', loginBody),
    loginController(auth),
  );
}
