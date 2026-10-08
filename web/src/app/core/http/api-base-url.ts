import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Where the API lives, without a trailing slash. A token so tests can point it anywhere. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

/**
 * The API path of a resolved URL (`/records`, no query), or null for any other origin.
 * Interceptors that must not leak to third parties, or that classify requests, use this.
 */
export function apiPathOf(url: string, baseUrl: string): string | null {
  if (!url.startsWith(`${baseUrl}/`)) return null;
  const path = url.slice(baseUrl.length);
  const queryStart = path.indexOf('?');
  return queryStart === -1 ? path : path.slice(0, queryStart);
}
