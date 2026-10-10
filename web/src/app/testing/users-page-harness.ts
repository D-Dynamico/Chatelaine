/** Opens the users page the way the admin route does, for the page and its actions (§20). */
import { HttpTestingController, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionStore } from '../core/auth/session-store';
import { MEERA, RIYA, TEST_API_BASE } from './fixtures';
import { provideTestHttp } from './http-testing';
import { AdminUsersService } from '../features/admin/admin-users.service';
import { UsersPage } from '../features/admin/users-page';

export const USERS = `${TEST_API_BASE}/admin/users`;
export const pageOf = (
  total: number,
  page = 1,
  items: unknown[] = total > 0 ? [MEERA, RIYA] : [],
) => ({
  items,
  page,
  pageSize: 10,
  total,
});

export async function openPage(url = '/admin/users') {
  TestBed.configureTestingModule({
    providers: [
      ...provideTestHttp(),
      // On the route, as in admin.routes.ts, so a dialog that cannot see it fails here too.
      provideRouter([
        { path: 'admin/users', component: UsersPage, providers: [AdminUsersService] },
      ]),
      // jsdom fires no animation events, so a dialog would never finish closing.
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  TestBed.inject(SessionStore).start('jwt', MEERA);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const host = (): HTMLElement => {
    const element = harness.routeNativeElement;
    if (!element) throw new Error('The page did not render');
    return element;
  };
  const settle = () => harness.fixture.whenStable();
  const nextRequest = (): TestRequest => http.expectOne((req) => req.url === USERS);
  const buttonNamed = (name: string): HTMLButtonElement => {
    const button = [...host().querySelectorAll('button')].find((candidate) =>
      candidate.textContent.includes(name),
    );
    if (!button) throw new Error(`No "${name}" button`);
    return button;
  };
  return { http, host, settle, nextRequest, buttonNamed, router: TestBed.inject(Router) };
}
