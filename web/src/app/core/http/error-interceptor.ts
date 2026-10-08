import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from '../auth/session-store';
import { type ApiError, toApiError } from './api-error';
import { API_BASE_URL, apiPathOf } from './api-base-url';
import { SILENT_AUTH } from './http-context-tokens';

const SESSION_ENDED_CODES: readonly string[] = ['UNAUTHENTICATED', 'SESSION_INVALID'];
const LOGIN_PATH = '/auth/login';

/**
 * Turns every failure into an `ApiError` (§17). A 401 that means the session ended clears
 * it and sends the user to sign in again, except where the caller expects a 401: a failed
 * login, and requests marked `SILENT_AUTH`.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const baseUrl = inject(API_BASE_URL);

  const endsSession = (error: ApiError, failed: HttpRequest<unknown>): boolean =>
    error.status === 401 &&
    SESSION_ENDED_CODES.includes(error.code) &&
    apiPathOf(failed.url, baseUrl) !== LOGIN_PATH &&
    !failed.context.get(SILENT_AUTH);

  return next(request).pipe(
    catchError((caught: unknown) => {
      // An ApiError from further in (the client timeout) is already in its final form.
      if (!(caught instanceof HttpErrorResponse)) return throwError(() => caught);
      const error = toApiError(caught);
      if (endsSession(error, request)) {
        session.clear();
        void router.navigate(['/login'], {
          queryParams: { reason: 'expired', returnUrl: router.url },
        });
      }
      return throwError(() => error);
    }),
  );
};
