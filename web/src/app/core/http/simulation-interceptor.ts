import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { endpointGroupOf, isSimulatedGroup } from '../latency/endpoint-group';
import { LatencySettingsStore } from '../latency/latency-settings-store';
import { API_BASE_URL, apiPathOf } from './api-base-url';

/**
 * Appends the lab's `delay` and, when armed, a one-shot `fail=true` (§9, §19). Only the
 * groups the lab controls are touched: `/health` must measure the real server, and login
 * is never slowed.
 */
export const simulationInterceptor: HttpInterceptorFn = (request, next) => {
  const path = apiPathOf(request.url, inject(API_BASE_URL));
  const group = path === null ? null : endpointGroupOf(path);
  if (!isSimulatedGroup(group)) return next(request);

  const settings = inject(LatencySettingsStore);
  const delayMs = settings.delays()[group];
  let params = request.params;
  if (delayMs > 0) params = params.set('delay', delayMs);
  if (settings.takeFailure(group)) params = params.set('fail', true);
  return params === request.params ? next(request) : next(request.clone({ params }));
};
