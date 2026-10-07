import { Router } from 'express';
import { meController } from '../controllers/me.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import type { AuthService } from '../services/auth.service.js';

export function meRoutes(auth: AuthService): Router {
  return Router().get('/me', authenticate(auth), meController);
}
