import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, type Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { MEERA, RIYA } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { WARM_UP_TIMEOUT_MS, warmLazyRoutes } from '../../testing/lazy-routes';
import { type UserView } from '../models/user';
import { authGuard, guestGuard } from './auth-guard';
import { ROLE_REFUSED_MESSAGE } from './role-guard';
import { SessionStore } from './session-store';

async function navigateAs(user: UserView | null, url: string, table: Routes = routes) {
  // The pages these routes open request their data. No interceptors, so nothing starts the
  // client timeout: an unanswered request stays pending and cannot fail a later test.
  TestBed.configureTestingModule({ providers: [provideRouter(table), ...provideTestHttp([])] });
  if (user) TestBed.inject(SessionStore).start('jwt', user);
  // The guard posts the refusal; the shell shows it. The snackbar is what the user sees.
  const snackBar = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return { url: TestBed.inject(Router).url, snackBar, page: harness.routeNativeElement };
}

describe('route guards', () => {
  beforeAll(warmLazyRoutes, WARM_UP_TIMEOUT_MS);

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('authGuard', () => {
    it('sends a signed-out user to sign in, keeping the full target as returnUrl', async () => {
      const { url } = await navigateAs(null, '/dashboard?tab=open');

      expect(url).toBe('/login?returnUrl=%2Fdashboard%3Ftab%3Dopen');
    });

    it('lets a signed-in user through', async () => {
      const { url } = await navigateAs(RIYA, '/dashboard');

      expect(url).toBe('/dashboard');
    });

    it('needs a confirmed user, not just a stored token', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      sessionStorage.setItem('chatelaine.token', 'jwt');
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/dashboard');

      expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fdashboard');
    });
  });

  describe('guestGuard', () => {
    it('sends a signed-in user from the sign-in page to the dashboard', async () => {
      const { url } = await navigateAs(RIYA, '/login');

      expect(url).toBe('/dashboard');
    });

    it('shows the sign-in page to a signed-out user', async () => {
      const { url } = await navigateAs(null, '/login');

      expect(url).toBe('/login');
    });
  });

  describe('roleGuard', () => {
    it('blocks a General User from /admin, back to the dashboard with a message', async () => {
      const { url, snackBar } = await navigateAs(RIYA, '/admin/users');

      expect(url).toBe('/dashboard');
      expect(snackBar).toHaveBeenCalledWith(ROLE_REFUSED_MESSAGE, undefined, expect.anything());
    });

    it('allows an Admin into /admin', async () => {
      const { url, snackBar } = await navigateAs(MEERA, '/admin');

      expect(url).toBe('/admin/users');
      expect(snackBar).not.toHaveBeenCalled();
    });

    /**
     * Uses the app's own admin route with only the loader swapped for a spy, so moving
     * its guard from canMatch to canActivate (which runs after loading) turns this red.
     */
    it('never loads the admin code for a General User, and does for an Admin', async () => {
      @Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
      class Blank {}
      const loadAdmin = vi.fn(() => [{ path: 'users', component: Blank }]);
      const shell = routes.find((route) => route.canMatch?.includes(authGuard));
      const admin = shell?.children?.find((route) => route.path === 'admin');
      if (!shell || !admin) throw new Error('The route table has no admin route');
      const table: Routes = [
        {
          ...shell,
          children: [
            { ...admin, loadChildren: loadAdmin },
            { path: '**', component: Blank },
          ],
        },
        { path: 'login', canMatch: [guestGuard], component: Blank },
      ];

      const general = await navigateAs(RIYA, '/admin/users', table);
      expect(general.url).toBe('/dashboard');
      expect(loadAdmin).not.toHaveBeenCalled();

      TestBed.resetTestingModule();
      const adminUser = await navigateAs(MEERA, '/admin/users', table);
      expect(adminUser.url).toBe('/admin/users');
      expect(loadAdmin).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the not-found page inside the shell for an unknown path', async () => {
    const { url, page } = await navigateAs(RIYA, '/nowhere');

    expect(url).toBe('/nowhere');
    expect(page?.textContent).toContain("This page doesn't exist");
  });
});
