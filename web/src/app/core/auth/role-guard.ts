import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { type CanMatchFn, Router } from '@angular/router';
import { type Role } from '../models/user';
import { APP_PATHS } from '../routing/app-paths';
import { signInRedirect } from './auth-guard';
import { SessionStore } from './session-store';

export const ROLE_REFUSED_MESSAGE = 'User management is for admins.';

/**
 * Lets a route match only for the given roles. As a `canMatch` guard it runs before
 * `loadChildren`, so a refused user never downloads the route's code (§14). This is a
 * convenience for the UI: the API refuses the same users on its own (§12).
 */
export function roleGuard(...allowed: readonly Role[]): CanMatchFn {
  return () => {
    const session = inject(SessionStore);
    const router = inject(Router);
    const user = session.user();
    if (!session.isSignedIn() || user === null) return signInRedirect(router);
    if (allowed.includes(user.role)) return true;
    inject(MatSnackBar).open(ROLE_REFUSED_MESSAGE, undefined, { duration: 5_000 });
    return router.createUrlTree([APP_PATHS.dashboard]);
  };
}
