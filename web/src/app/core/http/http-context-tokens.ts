import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marks a request whose 401 is expected and handled by its caller, so `errorInterceptor`
 * does not treat it as an expired session. The boot-time session restore uses it: a
 * visitor with a stale token should simply see the login page (§16).
 */
export const SILENT_AUTH = new HttpContextToken<boolean>(() => false);

export function silentAuth(): HttpContext {
  return new HttpContext().set(SILENT_AUTH, true);
}
