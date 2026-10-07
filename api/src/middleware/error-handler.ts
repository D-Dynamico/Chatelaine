import type { ErrorRequestHandler, RequestHandler } from 'express';
import {
  AppError,
  INTERNAL_ERROR_MESSAGE,
  NotFoundError,
  ValidationError,
  type ValidationIssue,
} from '../domain/errors.js';

interface ErrorBody {
  error: { code: string; message: string; details?: readonly ValidationIssue[] };
}

/** Errors raised by express.json() carry an HTTP status and a type string. */
function isBodyParserError(error: unknown): error is { status: number; type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    error.type.startsWith('entity.')
  );
}

function bodyParserMessage(type: string): string {
  if (type === 'entity.too.large') return 'The request body is too large.';
  if (type === 'entity.parse.failed') return 'The request body is not valid JSON.';
  return 'The request body could not be read.';
}

function toAppError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;
  if (isBodyParserError(error)) return new ValidationError(bodyParserMessage(error.type), []);
  return null;
}

/** Last route: anything that reached here matched no path. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError('NOT_FOUND', `No endpoint matches ${req.method} ${req.path}.`));
};

/**
 * The only place an error becomes a response (docs/API.md §13). Known errors keep their
 * code and message; anything else is logged in full and returned as a generic 500.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const known = toAppError(error);
  if (!known) {
    req.log.error({ err: error }, 'unhandled error');
    const body: ErrorBody = { error: { code: 'INTERNAL', message: INTERNAL_ERROR_MESSAGE } };
    res.status(500).json(body);
    return;
  }
  const body: ErrorBody = { error: { code: known.code, message: known.message } };
  if (known.details) body.error.details = known.details;
  res.status(known.status).json(body);
};
