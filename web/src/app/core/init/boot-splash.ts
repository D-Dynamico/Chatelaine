import {
  DOCUMENT,
  type EnvironmentProviders,
  inject,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  type Event,
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  Router,
} from '@angular/router';
import { filter, take } from 'rxjs';

/** The id of index.html's static splash, which covers the page until the first one is ready. */
export const BOOT_SPLASH_ELEMENT_ID = 'boot-splash';

/** A redirect cancels one navigation and starts the next, so it does not count as settled. */
function isSettled(event: Event): boolean {
  if (event instanceof NavigationEnd || event instanceof NavigationError) return true;
  return event instanceof NavigationCancel && event.code !== NavigationCancellationCode.Redirect;
}

/**
 * Removes the splash once the first page has rendered, including the time its lazy chunk
 * takes to load (§16). The router's own "blocking initial navigation" would also hide that
 * load, but it runs as a second app initializer alongside the boot sequence, so the route
 * guards would decide before the session was restored.
 */
export function provideBootSplash(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const document = inject(DOCUMENT);
    inject(Router)
      .events.pipe(filter(isSettled), take(1))
      .subscribe(() => {
        document.getElementById(BOOT_SPLASH_ELEMENT_ID)?.remove();
      });
  });
}
