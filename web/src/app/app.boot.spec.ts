import { HttpBackend, type HttpEvent, type HttpRequest, HttpResponse } from '@angular/common/http';
import { type ApplicationRef } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { type Observable, delay, of } from 'rxjs';
import { App } from './app';
import { appConfig } from './app.config';
import { STORAGE_KEYS } from './core/storage/storage-keys';
import { RIYA } from './testing/fixtures';
import { WARM_UP_TIMEOUT_MS, warmLazyRoutes } from './testing/lazy-routes';

/** Answers like the API, a little later, so a guard that runs too early sees no session. */
class SlowFakeApi implements HttpBackend {
  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const path = new URL(request.url).pathname;
    const body = path.endsWith('/health') ? { status: 'ok' } : RIYA;
    return of(new HttpResponse({ status: 200, body, url: request.url })).pipe(delay(30));
  }
}

/**
 * Boots the real app config, which unit tests of single providers cannot do. It exists
 * because the router's blocking initial navigation once ran beside the boot initializer and
 * sent a signed-in user to the login page on every reload (2026-10-08 session note).
 */
describe('booting the app', () => {
  let app: ApplicationRef | undefined;

  beforeAll(warmLazyRoutes, WARM_UP_TIMEOUT_MS);

  afterEach(() => {
    app?.destroy();
    sessionStorage.clear();
    history.replaceState(null, '', '/');
  });

  it('keeps a stored session on reload: the guards run after it is restored', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'jwt');
    history.replaceState(null, '', '/dashboard');
    document.body.append(document.createElement('app-root'));

    app = await bootstrapApplication(App, {
      providers: [...appConfig.providers, { provide: HttpBackend, useClass: SlowFakeApi }],
    });
    const router = app.injector.get(Router);
    await vi.waitFor(() => {
      expect(router.navigated).toBe(true);
    });

    expect(router.url).toBe('/dashboard');
  });
});
