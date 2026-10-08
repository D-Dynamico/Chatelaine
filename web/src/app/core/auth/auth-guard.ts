import { inject } from '@angular/core';
import { type CanMatchFn, Router, type UrlTree } from '@angular/router';
import { APP_PATHS } from '../routing/app-paths';
import { SessionStore } from './session-store';

/**
 * The sign-in page, remembering where the user was going. `canMatch` guards see only URL
 * segments, so the full target (path and query) comes from the navigation in progress.
 */
export function signInRedirect(router: Router): UrlTree {
  const target = router.currentNavigation()?.extractedUrl;
  const returnUrl = target ? router.serializeUrl(target) : APP_PATHS.home;
  return router.createUrlTree([APP_PATHS.login], { queryParams: { returnUrl } });
}

/**
 * On `canMatch` rather than `canActivate`, so a signed-out user never even matches the
 * shell's routes, and nothing under it (such as the admin chunk) starts to load.
 */
export const authGuard: CanMatchFn = () => {
  const router = inject(Router);
  return inject(SessionStore).isSignedIn() ? true : signInRedirect(router);
};

/** Keeps a signed-in user off the sign-in page. */
export const guestGuard: CanMatchFn = () =>
  inject(SessionStore).isSignedIn() ? inject(Router).createUrlTree([APP_PATHS.dashboard]) : true;
