import { type HttpRequest } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SessionStore } from '../../core/auth/session-store';
import { type UserView } from '../../core/models/user';
import { MEERA, RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { DashboardDataService } from './dashboard-data.service';
import { RECORDS_MESSAGES, RecordsPanel, SEARCH_DEBOUNCE_MS } from './records-panel';

const RECORDS = `${TEST_API_BASE}/records`;
const ROW = {
  id: 'SR-1001',
  title: 'VPN drops every hour',
  category: 'NETWORK',
  priority: 'MEDIUM',
  status: 'OPEN',
  accessLevel: 'GENERAL',
  createdAt: '2026-09-22T06:15:00.000Z',
  updatedAt: '2026-09-24T10:40:00.000Z',
};
const pageOf = (total: number, page = 1, items: unknown[] = total > 0 ? [ROW] : []) => ({
  items,
  page,
  pageSize: 10,
  total,
});

async function openPanel(user: UserView, url = '/dashboard') {
  TestBed.configureTestingModule({
    providers: [
      ...provideTestHttp(),
      provideRouter([{ path: 'dashboard', component: RecordsPanel }]),
      DashboardDataService,
    ],
  });
  TestBed.inject(SessionStore).start('jwt', user);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const host = (): HTMLElement => {
    const element = harness.routeNativeElement;
    if (!element) throw new Error('The panel did not render');
    return element;
  };
  const settle = () => harness.fixture.whenStable();
  const nextRequest = (): { request: HttpRequest<unknown>; flush: (body: object) => void } => {
    const pending = http.expectOne((req) => req.url === RECORDS);
    return {
      request: pending.request,
      flush: (body) => {
        pending.flush(body);
      },
    };
  };
  return { harness, http, host, settle, nextRequest, router: TestBed.inject(Router) };
}

describe('RecordsPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('drops an admin-only filter from a General User link before requesting', async () => {
    const panel = await openPanel(RIYA, '/dashboard?access=ADMIN&status=OPEN');

    const { request } = panel.nextRequest();

    expect(request.params.has('accessLevel')).toBe(false);
    expect(request.params.get('status')).toBe('OPEN');
  });

  it('keeps an Admin filter for an Admin', async () => {
    const panel = await openPanel(MEERA, '/dashboard?access=ADMIN');

    expect(panel.nextRequest().request.params.get('accessLevel')).toBe('ADMIN');
  });

  it('never sends an invalid param, whatever the URL says', async () => {
    const panel = await openPanel(MEERA, '/dashboard?status=open&page=-3&sort=ownerId&q=');

    const { request } = panel.nextRequest();

    expect(request.params.keys().sort()).toEqual(['order', 'page', 'pageSize', 'sort']);
    expect(request.params.get('sort')).toBe('createdAt');
    expect(request.params.get('page')).toBe('1');
  });

  it('searches 300 ms after typing stops, in the URL, without adding history', async () => {
    const panel = await openPanel(RIYA);
    panel.nextRequest().flush(pageOf(1));
    await panel.settle();
    // After the panel is open, never before: opening it waits for Angular to become stable, which
    // relies on a setTimeout, and a faked one never fires. rxjs reads setInterval and Date.now
    // when the debounce is scheduled, so faking them here still controls it.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    const navigate = vi.spyOn(panel.router, 'navigate');
    const input = panel.host().querySelector<HTMLInputElement>('input[type="search"]');
    if (!input) throw new Error('No search box');

    for (const text of ['v', 'vp', 'vpn']) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(100);
    }
    panel.http.expectNone((req) => req.url === RECORDS);
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    await panel.settle();

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate.mock.calls[0]?.[1]).toMatchObject({ replaceUrl: true });
    expect(panel.router.url).toBe('/dashboard?q=vpn');
    expect(panel.nextRequest().request.params.get('q')).toBe('vpn');
  });

  it("tells a General User with nothing raised that they haven't raised any", async () => {
    const panel = await openPanel(RIYA);

    panel.nextRequest().flush(pageOf(0));
    await panel.settle();

    expect(panel.host().textContent).toContain(RECORDS_MESSAGES.noneRaised);
    expect(panel.host().textContent).not.toContain('Clear filters');
  });

  it('offers to clear filters when filters match nothing, and clears them', async () => {
    const panel = await openPanel(RIYA, '/dashboard?status=CLOSED&q=zzz');
    panel.nextRequest().flush(pageOf(0));
    await panel.settle();
    expect(panel.host().textContent).toContain(RECORDS_MESSAGES.noneMatch);

    const clear = [...panel.host().querySelectorAll('button')].find((button) =>
      button.textContent.includes('Clear filters'),
    );
    clear?.click();
    await panel.settle();

    expect(panel.router.url).toBe('/dashboard');
    expect(panel.nextRequest().request.params.has('status')).toBe(false);
  });

  it('keeps the rows and shows the progress line while the next page loads', async () => {
    const panel = await openPanel(RIYA);
    panel.nextRequest().flush(pageOf(25));
    await panel.settle();

    await panel.router.navigateByUrl('/dashboard?page=2');
    await panel.settle();

    expect(panel.host().querySelector('app-records-table')).not.toBeNull();
    expect(panel.host().querySelector('app-skeleton')).toBeNull();
    expect(panel.host().querySelector('mat-progress-bar')).not.toBeNull();
    panel.nextRequest().flush(pageOf(25, 2));
    await panel.settle();
    expect(panel.host().querySelector('mat-progress-bar')).toBeNull();
  });

  it('moves a page past the end to the last page', async () => {
    const panel = await openPanel(RIYA, '/dashboard?page=9');

    panel.nextRequest().flush(pageOf(25, 9, []));
    await panel.settle();

    expect(panel.router.url).toBe('/dashboard?page=3');
    expect(panel.nextRequest().request.params.get('page')).toBe('3');
  });

  it('shows the error with its code, and retries', async () => {
    const panel = await openPanel(RIYA);
    panel.http
      .expectOne((req) => req.url === RECORDS)
      .flush(errorBody('SIMULATED_FAILURE'), { status: 503, statusText: 'Service Unavailable' });
    await panel.settle();
    expect(panel.host().textContent).toContain(RECORDS_MESSAGES.failed);
    expect(panel.host().textContent).toContain('503 SIMULATED_FAILURE');

    const retry = [...panel.host().querySelectorAll('button')].find((button) =>
      button.textContent.includes('Try again'),
    );
    retry?.click();

    panel.nextRequest().flush(pageOf(1));
    await panel.settle();
    expect(panel.host().textContent).toContain('SR-1001');
  });
});
