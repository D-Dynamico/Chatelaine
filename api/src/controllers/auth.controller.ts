import type { RequestHandler } from 'express';
import { readValidated } from '../middleware/validate.js';
import { loginBody } from '../schemas/auth.schema.js';
import type { AuthService } from '../services/auth.service.js';

export function loginController(auth: AuthService): RequestHandler {
  return async (_req, res) => {
    res.json(await auth.login(readValidated(res, loginBody)));
  };
}
