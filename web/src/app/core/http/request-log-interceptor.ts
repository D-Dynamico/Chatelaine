import { HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, tap } from 'rxjs';
import { endpointGroupOf } from '../latency/endpoint-group';
import { type RequestEnd, RequestLogStore } from '../latency/request-log-store';
import { ApiError } from './api-error';
import { API_BASE_URL, apiPathOf } from './api-base-url';
import { parseServerTiming } from './server-timing';

function endOfFailure(error: unknown): RequestEnd {
  if (!(error instanceof ApiError)) return { outcome: 'error', status: null };
  return {
    outcome: error.code === 'CLIENT_TIMEOUT' ? 'timeout' : 'error',
    status: error.status === 0 ? null : error.status,
    ...error.timing,
  };
}

/**
 * Records every API request for the timeline (§17, §19). It sits outside the timeout and
 * error interceptors, so a timeout reaches it as an error it can name. A request that ends
 * with neither a response nor an error was unsubscribed, which is what `switchMap` does to
 * a request it replaces: that is "cancelled".
 */
export const requestLogInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);
  const path = apiPathOf(request.url, baseUrl);
  const group = path === null ? null : endpointGroupOf(path);
  if (group === null) return next(request);

  const log = inject(RequestLogStore);
  const id = log.start({
    group,
    method: request.method,
    url: request.urlWithParams.slice(baseUrl.length),
  });
  let hasEnded = false;
  const end = (result: RequestEnd): void => {
    hasEnded = true;
    log.finish(id, result);
  };

  return next(request).pipe(
    tap({
      next: (event) => {
        if (!(event instanceof HttpResponse)) return;
        const timing = parseServerTiming(event.headers.get('Server-Timing'));
        end({ outcome: 'ok', status: event.status, ...timing });
      },
      error: (error: unknown) => {
        end(endOfFailure(error));
      },
    }),
    finalize(() => {
      if (!hasEnded) end({ outcome: 'cancelled', status: null });
    }),
  );
};
