import type { RequestHandler } from 'express';
import { ForbiddenError } from '../domain/errors.js';
import type { Role } from '../domain/user.js';
import { currentUser } from './authenticate.js';

/**
 * 403 unless the signed-in user has one of the allowed roles. Admin routes put this before
 * validate, so a General User learns nothing about their input shape (docs/API.md §12).
 */
export function requireRole(...allowed: readonly Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!allowed.includes(currentUser(req).role)) throw new ForbiddenError();
    next();
  };
}
