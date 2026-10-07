import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  InvalidCredentialsError,
  NotFoundError,
  RateLimitedError,
  SessionInvalidError,
  SimulatedFailureError,
  SimulationDisabledError,
  UnauthenticatedError,
  ValidationError,
} from '../../src/domain/errors.js';

describe('AppError subclasses', () => {
  it.each([
    [new ValidationError('bad input', []), 400, 'VALIDATION_FAILED'],
    [new SimulationDisabledError(), 400, 'SIMULATION_DISABLED'],
    [new UnauthenticatedError(), 401, 'UNAUTHENTICATED'],
    [new SessionInvalidError(), 401, 'SESSION_INVALID'],
    [new InvalidCredentialsError(), 401, 'INVALID_CREDENTIALS'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError('USER_NOT_FOUND', 'No such user.'), 404, 'USER_NOT_FOUND'],
    [new NotFoundError('NOT_FOUND', 'No such route.'), 404, 'NOT_FOUND'],
    [new ConflictError('USER_EXISTS', 'Taken.'), 409, 'USER_EXISTS'],
    [new ConflictError('SELF_ACTION', 'Not yourself.'), 409, 'SELF_ACTION'],
    [new ConflictError('LAST_ADMIN', 'Keep one.'), 409, 'LAST_ADMIN'],
    [new RateLimitedError(), 429, 'RATE_LIMITED'],
    [new SimulatedFailureError(), 503, 'SIMULATED_FAILURE'],
  ])('%o carries status %i and code %s from the §13 table', (error, status, code) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });

  it('names each error after its class, so logs say what was thrown', () => {
    expect(new ForbiddenError().name).toBe('ForbiddenError');
    expect(new ConflictError('USER_EXISTS', 'Taken.').name).toBe('ConflictError');
  });

  it('accepts only the codes that belong to each class (checked by typecheck)', () => {
    // @ts-expect-error FORBIDDEN is not a conflict; the narrowed constructor must reject it.
    expect(new ConflictError('FORBIDDEN', 'x').status).toBe(403);
    // @ts-expect-error USER_EXISTS is not a not-found code.
    expect(new NotFoundError('USER_EXISTS', 'x').status).toBe(409);
  });

  it('carries details only for validation failures', () => {
    const issues = [{ path: 'delay', message: 'must be at most 10000' }];
    expect(new ValidationError('bad input', issues).details).toEqual(issues);
    expect(new ForbiddenError().details).toBeUndefined();
  });
});
