import type { HttpErrorResponse } from '@angular/common/http';
import {
  API_ERROR_CODES,
  type ApiErrorBody,
  type ApiErrorCode,
  type ClientErrorCode,
  type ErrorDetail,
} from '../models/api-error-body';
import { NO_SERVER_TIMING, type ServerTiming, parseServerTiming } from './server-timing';

/** Every failed request reaches services and components as this, never as an HTTP error. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | ClientErrorCode,
    message: string,
    readonly details: readonly ErrorDetail[] = [],
    /** Kept so the request timeline can split a failed request's bar too (§19). */
    readonly timing: ServerTiming = NO_SERVER_TIMING,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const CLIENT_ERROR_MESSAGES: Readonly<Record<ClientErrorCode, string>> = {
  CLIENT_TIMEOUT: 'The server took too long to respond. Try again.',
  NETWORK_ERROR: "Can't reach the server. Check your connection, then try again.",
  UNEXPECTED_RESPONSE: "The server's response wasn't what the app expected. Try again.",
};

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    API_ERROR_CODES.some((code) => code === error.code) &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

export function toApiError(response: HttpErrorResponse): ApiError {
  if (response.status === 0) {
    return new ApiError(0, 'NETWORK_ERROR', CLIENT_ERROR_MESSAGES.NETWORK_ERROR);
  }
  const timing = parseServerTiming(response.headers.get('Server-Timing'));
  const body: unknown = response.error;
  if (!isApiErrorBody(body)) {
    const message = CLIENT_ERROR_MESSAGES.UNEXPECTED_RESPONSE;
    return new ApiError(response.status, 'UNEXPECTED_RESPONSE', message, [], timing);
  }
  const { code, message, details } = body.error;
  return new ApiError(response.status, code, message, details, timing);
}
