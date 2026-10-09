import { HttpTestingController, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionStore } from '../../core/auth/session-store';
import { MEERA, RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { AdminUsersService } from './admin-users.service';
import {
  USERS_MESSAGES,
  USER_CONFIRMATIONS,
  USER_SEARCH_DEBOUNCE_MS,
  UsersPage,
} from './users-page';

const USERS = `${TEST_API_BASE}/admin/users`;
const pageOf = (total: number, page = 1, items: unknown[] = total > 0 ? [MEERA, RIYA] : []) => ({
  items,
  page,
  pageSize: 10,
  total,
});

async function openPage(url = '/admin/users') {
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

describe('UsersPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('sends the filters in the URL, and never an invalid one', async () => {
    const page = await openPage('/admin/users?role=ADMIN&status=active&page=-2&sort=email');

    const { request } = page.nextRequest();

    expect(request.params.keys().sort()).toEqual(['order', 'page', 'pageSize', 'role', 'sort']);
    expect(request.params.get('role')).toBe('ADMIN');
    expect(request.params.get('sort')).toBe('userId');
    expect(request.params.get('page')).toBe('1');
  });

  it('searches 300 ms after typing stops, in the URL, without adding history', async () => {
    // debounceTime schedules with setInterval and measures with Date.now.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    const page = await openPage();
    page.nextRequest().flush(pageOf(2));
    await page.settle();
    const navigate = vi.spyOn(page.router, 'navigate');
    const input = page.host().querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error('No search box');

    for (const text of ['r', 'ri', 'riya']) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(100);
    }
    page.http.expectNone((req) => req.url === USERS);
    await vi.advanceTimersByTimeAsync(USER_SEARCH_DEBOUNCE_MS);
    await page.settle();

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate.mock.calls[0]?.[1]).toMatchObject({ replaceUrl: true });
    expect(page.router.url).toBe('/admin/users?q=riya');
    expect(page.nextRequest().request.params.get('q')).toBe('riya');
  });

  it('says no users match, and clears the filters from the URL', async () => {
    const page = await openPage('/admin/users?role=GENERAL&status=DISABLED');
    page.nextRequest().flush(pageOf(0));
    await page.settle();

    expect(page.host().textContent).toContain(USERS_MESSAGES.noneMatch);
    page.buttonNamed('Clear filters').click();
    await page.settle();

    expect(page.router.url).toBe('/admin/users');
    expect(page.nextRequest().request.params.has('role')).toBe(false);
  });

  it('shows the failure with its code, and "Try again" reloads', async () => {
    const page = await openPage();
    page
      .nextRequest()
      .flush(errorBody('SIMULATED_FAILURE'), { status: 503, statusText: 'Service Unavailable' });
    await page.settle();

    expect(page.host().textContent).toContain(USERS_MESSAGES.failed);
    expect(page.host().textContent).toContain('503 SIMULATED_FAILURE');
    page.buttonNamed('Try again').click();
    page.nextRequest().flush(pageOf(2));
    await page.settle();

    expect(page.host().textContent).toContain('Riya Sharma');
  });

  it('moves to the last page when the one asked for is past the end', async () => {
    const page = await openPage('/admin/users?page=4');
    page.nextRequest().flush(pageOf(12, 4, []));
    await page.settle();

    expect(page.router.url).toBe('/admin/users?page=2');
    expect(page.nextRequest().request.params.get('page')).toBe('2');
  });

  describe('dialogs', () => {
    afterEach(() => {
      document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => {
        overlay.replaceChildren();
      });
    });

    const inOverlay = () => document.querySelector('.cdk-overlay-container');
    const overlayButton = (name: string): HTMLButtonElement => {
      const button = [...(inOverlay()?.querySelectorAll('button') ?? [])].find((candidate) =>
        candidate.textContent.includes(name),
      );
      if (!button) throw new Error(`No "${name}" button in the overlay`);
      return button;
    };

    it('opens the create dialog with the route-provided service', async () => {
      const page = await openPage();
      page.nextRequest().flush(pageOf(2));
      await page.settle();

      page.buttonNamed('Create user').click();
      await page.settle();

      expect(inOverlay()?.querySelector('h2')?.textContent).toContain('Create user');
    });

    it('reloads the table in place and confirms once an edit is saved', async () => {
      const page = await openPage();
      page.nextRequest().flush(pageOf(2));
      await page.settle();
      page
        .host()
        .querySelector<HTMLButtonElement>('[aria-label="Actions for Riya Sharma"]')
        ?.click();
      await page.settle();
      overlayButton('Edit user').click();
      await page.settle();

      const department = inOverlay()?.querySelector<HTMLInputElement>(
        'input[formcontrolname="department"]',
      );
      if (!department) throw new Error('No department field');
      department.value = 'Accounts';
      department.dispatchEvent(new Event('input'));
      await page.settle();
      overlayButton('Save changes').click();
      page.http.expectOne(`${USERS}/riya`).flush({ ...RIYA, department: 'Accounts' });
      await page.settle();

      const reload = page.nextRequest();
      expect(page.host().textContent).toContain('Riya Sharma');
      expect(page.host().querySelector('mat-progress-bar')).not.toBeNull();
      reload.flush(pageOf(2));
      await page.settle();
      expect(inOverlay()?.textContent).toContain(USER_CONFIRMATIONS.saved);
    });
  });
});
