import { type HttpInterceptorFn } from '@angular/common/http';
import { apiUrlInterceptor } from './api-url-interceptor';
import { authInterceptor } from './auth-interceptor';
import { errorInterceptor } from './error-interceptor';

/** The registered chain, outermost first; the last sits closest to the network (§17). */
export const API_INTERCEPTORS: readonly HttpInterceptorFn[] = [
  apiUrlInterceptor,
  authInterceptor,
  errorInterceptor,
];
