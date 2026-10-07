import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RateLimitedError } from '../domain/errors.js';
import { LOGIN_RATE_LIMIT } from '../domain/limits.js';

/**
 * Caps login attempts per client IP (D27). Every attempt counts, successful or not. Each
 * call makes a fresh in-memory counter, so each app built by buildApp starts clean.
 * Retry-After is set by the library before the handler runs; the handler only hands the
 * error to the central error middleware, so the body keeps the one error shape.
 */
export function loginRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: LOGIN_RATE_LIMIT.windowMs,
    limit: LOGIN_RATE_LIMIT.attempts,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new RateLimitedError());
    },
  });
}
