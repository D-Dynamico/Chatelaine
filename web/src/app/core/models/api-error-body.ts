/** Mirrors docs/API.md §13: the one error shape every API failure uses. */

export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'SIMULATION_DISABLED',
  'UNAUTHENTICATED',
  'SESSION_INVALID',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'USER_NOT_FOUND',
  'NOT_FOUND',
  'USER_EXISTS',
  'SELF_ACTION',
  'LAST_ADMIN',
  'RATE_LIMITED',
  'INTERNAL',
  'SIMULATED_FAILURE',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Failures the browser detects itself, so the API never sends them. */
export const CLIENT_ERROR_CODES = [
  'CLIENT_TIMEOUT',
  'NETWORK_ERROR',
  'UNEXPECTED_RESPONSE',
] as const;
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export interface ErrorDetail {
  readonly path: string;
  readonly message: string;
}

export interface ApiErrorBody {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly details?: readonly ErrorDetail[];
  };
}
