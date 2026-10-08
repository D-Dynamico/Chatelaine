import { type HttpInterceptorFn } from '@angular/common/http';
import { apiUrlInterceptor } from './api-url-interceptor';
import { authInterceptor } from './auth-interceptor';
import { errorInterceptor } from './error-interceptor';
import { requestLogInterceptor } from './request-log-interceptor';
import { simulationInterceptor } from './simulation-interceptor';
import { timeoutInterceptor } from './timeout-interceptor';

/**
 * The registered chain, outermost first; the last sits closest to the network (§17). The
 * log must stay outside the timeout, or a timeout would reach it as an unsubscribe and be
 * recorded as "cancelled". A test runs through this exact array to hold that in place.
 */
export const API_INTERCEPTORS: readonly HttpInterceptorFn[] = [
  apiUrlInterceptor,
  authInterceptor,
  simulationInterceptor,
  requestLogInterceptor,
  errorInterceptor,
  timeoutInterceptor,
];
