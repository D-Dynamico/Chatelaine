import { errorBody } from '../../testing/fixtures';
import { USERS_MESSAGES, USER_SEARCH_DEBOUNCE_MS } from './users-page';
import { openPage, pageOf, USERS } from '../../testing/users-page-harness';

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
});
