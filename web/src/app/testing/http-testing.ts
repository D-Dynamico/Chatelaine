import { type HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { type EnvironmentProviders, type Provider } from '@angular/core';
import { API_BASE_URL } from '../core/http/api-base-url';
import { API_INTERCEPTORS } from '../core/http/api-interceptors';
import { TEST_API_BASE } from './fixtures';

/** HttpClient with the app's real interceptor chain, unless a test passes its own. */
export function provideTestHttp(
  interceptors: readonly HttpInterceptorFn[] = API_INTERCEPTORS,
): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([...interceptors])),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE },
  ];
}
