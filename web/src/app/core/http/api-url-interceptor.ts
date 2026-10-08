import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from './api-base-url';
import { API_PREFIX } from './api-paths';

/** First in the chain (§17), so every later interceptor sees the absolute URL. */
export const apiUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${API_PREFIX}/`)) return next(request);
  const url = `${inject(API_BASE_URL)}${request.url.slice(API_PREFIX.length)}`;
  return next(request.clone({ url }));
};
