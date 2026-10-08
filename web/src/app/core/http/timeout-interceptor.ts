import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timeout } from 'rxjs';
import { LatencySettingsStore } from '../latency/latency-settings-store';
import { ApiError, CLIENT_ERROR_MESSAGES } from './api-error';

/**
 * Last in the chain (§17), closest to the network. `each` rather than `first`: HttpClient
 * emits its "sent" event at once, which would satisfy `first` and disarm the timeout, so
 * the limit is measured between events, from sent to response.
 */
export const timeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const limitMs = inject(LatencySettingsStore).timeoutMs();
  return next(request).pipe(
    timeout({
      each: limitMs,
      with: () =>
        throwError(() => new ApiError(0, 'CLIENT_TIMEOUT', CLIENT_ERROR_MESSAGES.CLIENT_TIMEOUT)),
    }),
  );
};
