import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '../auth/session-store';
import { API_BASE_URL, apiPathOf } from './api-base-url';

/** Routes the API serves without a token (docs/API.md §8). */
const PUBLIC_PATHS: readonly string[] = ['/health', '/auth/login'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(SessionStore).token();
  // Only our own API ever sees the token, never a third-party origin.
  const path = apiPathOf(request.url, inject(API_BASE_URL));
  if (token === null || path === null || PUBLIC_PATHS.includes(path)) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
