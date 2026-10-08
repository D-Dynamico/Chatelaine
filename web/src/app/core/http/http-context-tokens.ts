import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marks a request whose 401 is expected and handled by its caller, so `errorInterceptor`
 * does not treat it as an expired session. The boot-time session restore uses it: a
 * visitor with a stale token should simply see the login page (§16).
 */
export const SILENT_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Marks a request the latency lab must not touch. Boot requests measure the real server,
 * as `/health` does: a delay or an armed failure meant for the profile panel would
 * otherwise be taken by the session restore, holding the splash or signing the user out.
 */
export const SKIP_SIMULATION = new HttpContextToken<boolean>(() => false);

export function silentAuth(): HttpContext {
  return new HttpContext().set(SILENT_AUTH, true);
}

/** The session restore at boot: a quiet 401, and never simulated. */
export function bootRestore(): HttpContext {
  return silentAuth().set(SKIP_SIMULATION, true);
}
