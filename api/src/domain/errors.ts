/**
 * Every failure the API can report, with its HTTP status (docs/API.md §13). Services throw
 * these; only the error middleware turns them into responses.
 */
export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  SIMULATION_DISABLED: 400,
  UNAUTHENTICATED: 401,
  SESSION_INVALID: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  USER_NOT_FOUND: 404,
  NOT_FOUND: 404,
  USER_EXISTS: 409,
  SELF_ACTION: 409,
  LAST_ADMIN: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SIMULATED_FAILURE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** Messages are shown in the UI as written, so they give direction rather than apology. */
export const INTERNAL_ERROR_MESSAGE = 'The server hit an unexpected error. Try again.';

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: readonly ValidationIssue[],
  ) {
    super(message);
    this.name = new.target.name;
    this.status = ERROR_STATUS[code];
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: readonly ValidationIssue[]) {
    super('VALIDATION_FAILED', message, details);
  }
}

export class SimulationDisabledError extends AppError {
  constructor() {
    super('SIMULATION_DISABLED', 'The delay and fail parameters are turned off on this server.');
  }
}

export class SimulatedFailureError extends AppError {
  constructor() {
    super('SIMULATED_FAILURE', 'This failure was requested with fail=true.');
  }
}

export class UnauthenticatedError extends AppError {
  constructor() {
    super('UNAUTHENTICATED', 'Sign in to continue.');
  }
}

export class SessionInvalidError extends AppError {
  constructor() {
    super('SESSION_INVALID', 'Your session ended. Sign in again.');
  }
}

/** One message for every login failure, so the response never says which part was wrong. */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', "That user ID, password and role don't match an active account.");
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super('FORBIDDEN', 'Your role does not have access to this.');
  }
}

export class RateLimitedError extends AppError {
  constructor() {
    super('RATE_LIMITED', 'Too many sign-in attempts. Wait a few minutes, then try again.');
  }
}

// The constructors below exist to narrow which codes each class accepts, so a service cannot
// throw a ConflictError with FORBIDDEN. The lint rule sees only that arguments pass through.
export class NotFoundError extends AppError {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(code: Extract<ErrorCode, 'NOT_FOUND' | 'USER_NOT_FOUND'>, message: string) {
    super(code, message);
  }
}

export class ConflictError extends AppError {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    code: Extract<ErrorCode, 'USER_EXISTS' | 'SELF_ACTION' | 'LAST_ADMIN'>,
    message: string,
  ) {
    super(code, message);
  }
}
