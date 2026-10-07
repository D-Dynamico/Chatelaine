import type { Request, RequestHandler } from 'express';
import { UnauthenticatedError } from '../domain/errors.js';
import type { User } from '../domain/user.js';
import type { AuthService } from '../services/auth.service.js';

/** "Bearer <jwt>", with the token in base64url segments. Anything else is refused. */
const BEARER_TOKEN = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/;

export interface AuthContext {
  readonly user: User;
}

/** Requires a valid session and attaches its user to req.auth (docs/API.md §8). */
export function authenticate(auth: AuthService): RequestHandler {
  return async (req, _res, next) => {
    const token = BEARER_TOKEN.exec(req.get('authorization') ?? '')?.[1];
    if (!token) throw new UnauthenticatedError();
    req.auth = { user: await auth.resolveSession(token) };
    next();
  };
}

/**
 * The signed-in user, for handlers behind authenticate. If a route forgot authenticate,
 * this fails closed with a 401 rather than running without a user.
 */
export function currentUser(req: Request): User {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.user;
}
