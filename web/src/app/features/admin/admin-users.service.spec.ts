import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { SessionStore } from '../../core/auth/session-store';
import { ApiError } from '../../core/http/api-error';
import { type UserListQuery } from '../../core/models/user';
import { type LoadState } from '../../shared/load-state/load-state';
import { MEERA, RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { AdminUsersService } from './admin-users.service';

const USERS = `${TEST_API_BASE}/admin/users`;
const BASE_QUERY: UserListQuery = { page: 1, pageSize: 10, sort: 'userId', order: 'asc' };
const pageOf = (total: number) => ({
  items: total > 0 ? [RIYA] : [],
  page: 1,
  pageSize: 10,
  total,
});
const notFound = { status: 404, statusText: 'Not Found' };
const unavailable = { status: 503, statusText: 'Service Unavailable' };

function setUp() {
  TestBed.configureTestingModule({
    providers: [...provideTestHttp(), provideRouter([]), AdminUsersService],
  });
  const http = TestBed.inject(HttpTestingController);
  const latest = <T>(source: { subscribe: (next: (value: T) => void) => unknown }) => {
    const box: { state?: T } = {};
    source.subscribe((value) => (box.state = value));
    return box;
  };
  return { admin: TestBed.inject(AdminUsersService), http, latest };
}

/** Runs a one-shot request to its outcome: the value, or the error it failed with. */
function outcome(source: { subscribe: (observer: object) => unknown }) {
  const box: { value?: unknown; error?: unknown } = {};
  source.subscribe({
    next: (value: unknown) => (box.value = value),
    error: (error: unknown) => (box.error = error),
  });
  return box;
}

describe('AdminUsersService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('users$', () => {
    it('sends only the query fields that are set, and reports no matches as empty', () => {
      const { admin, http, latest } = setUp();
      const query = new BehaviorSubject<UserListQuery>({ ...BASE_QUERY, role: 'ADMIN' });
      const users = latest<LoadState<unknown>>(admin.users$(query));

      const request = http.expectOne((req) => req.url === USERS);
      expect(request.request.params.keys().sort()).toEqual([
        'order',
        'page',
        'pageSize',
        'role',
        'sort',
      ]);
      request.flush(pageOf(0));

      expect(users.state).toEqual({ status: 'empty', isRefreshing: false });
    });

    it('keeps the rows on screen while it reloads after a change', () => {
      const { admin, http, latest } = setUp();
      const users = latest<LoadState<unknown>>(admin.users$(new BehaviorSubject(BASE_QUERY)));
      http.expectOne((req) => req.url === USERS).flush(pageOf(6));

      admin.reload();

      expect(users.state).toMatchObject({ status: 'loaded', isRefreshing: true });
      http.expectOne((req) => req.url === USERS).flush(pageOf(7));
      expect(users.state).toMatchObject({ status: 'loaded', isRefreshing: false });
    });

    it('cancels the first attempt when reloaded twice', () => {
      const { admin, http, latest } = setUp();
      const users = latest<LoadState<unknown>>(admin.users$(new BehaviorSubject(BASE_QUERY)));
      http.expectOne((req) => req.url === USERS).flush(errorBody('SIMULATED_FAILURE'), unavailable);
      expect(users.state).toMatchObject({ status: 'error' });

      admin.reload();
      const first = http.expectOne((req) => req.url === USERS);
      admin.reload();
      const second = http.expectOne((req) => req.url === USERS);

      expect(first.cancelled).toBe(true);
      second.flush(pageOf(6));
      expect(users.state).toMatchObject({ status: 'loaded' });
    });
  });

  describe('isUserIdTaken', () => {
    it('reads 404 USER_NOT_FOUND as free', () => {
      const { admin, http } = setUp();
      const result = outcome(admin.isUserIdTaken('neha'));

      http.expectOne(`${USERS}/neha`).flush(errorBody('USER_NOT_FOUND'), notFound);

      expect(result).toEqual({ value: false });
    });

    it('reads a found user as taken', () => {
      const { admin, http } = setUp();
      const result = outcome(admin.isUserIdTaken('riya'));

      http.expectOne(`${USERS}/riya`).flush({ ...RIYA, recordCount: 17 });

      expect(result).toEqual({ value: true });
    });

    it('passes any other failure on, so it is never read as an answer', () => {
      const { admin, http } = setUp();
      const result = outcome(admin.isUserIdTaken('neha'));

      http.expectOne(`${USERS}/neha`).flush(errorBody('SIMULATED_FAILURE'), unavailable);

      expect(result.value).toBeUndefined();
      expect(result.error).toMatchObject({ status: 503, code: 'SIMULATED_FAILURE' });
    });

    it('passes a client timeout on as well', async () => {
      vi.useFakeTimers();
      const { admin, http } = setUp();
      const result = outcome(admin.isUserIdTaken('neha'));
      http.expectOne(`${USERS}/neha`);

      await vi.advanceTimersByTimeAsync(60_000);

      expect(result.value).toBeUndefined();
      expect(result.error).toBeInstanceOf(ApiError);
      expect(result.error).toMatchObject({ code: 'CLIENT_TIMEOUT' });
    });

    it('encodes the userId it asks about', () => {
      const { admin, http } = setUp();
      admin.isUserIdTaken('a/b').subscribe({ error: () => undefined });

      http.expectOne(`${USERS}/a%2Fb`);
    });
  });

  describe('mutations', () => {
    it('creates with POST and deletes with DELETE', () => {
      const { admin, http } = setUp();
      const newUser = {
        userId: 'neha',
        displayName: 'Neha Iyer',
        email: 'neha@chatelaine.test',
        department: 'Design',
        role: 'GENERAL',
        password: 'Welcome@2026',
      } as const;

      admin.create(newUser).subscribe();
      const created = http.expectOne(USERS);
      expect(created.request.method).toBe('POST');
      expect(created.request.body).toEqual(newUser);

      admin.remove('neha').subscribe();
      expect(http.expectOne(`${USERS}/neha`).request.method).toBe('DELETE');
    });

    it("updates the session from the server's answer when admins edit themselves", () => {
      const { admin, http } = setUp();
      const session = TestBed.inject(SessionStore);
      session.start('jwt', MEERA);

      admin.update(MEERA.userId, { displayName: 'Typed in the form' }).subscribe();
      const request = http.expectOne(`${USERS}/meera.admin`);
      expect(request.request.method).toBe('PATCH');
      request.flush({ ...MEERA, displayName: 'Meera N.' });

      expect(session.user()?.displayName).toBe('Meera N.');
    });

    it('leaves the session alone when another user is edited', () => {
      const { admin, http } = setUp();
      const session = TestBed.inject(SessionStore);
      session.start('jwt', MEERA);

      admin.update(RIYA.userId, { displayName: 'Riya S.' }).subscribe();
      http.expectOne(`${USERS}/riya`).flush({ ...RIYA, displayName: 'Riya S.' });

      expect(session.user()).toEqual(MEERA);
    });

    it('leaves the session alone when a save fails', () => {
      const { admin, http } = setUp();
      const session = TestBed.inject(SessionStore);
      session.start('jwt', MEERA);

      admin.update(MEERA.userId, { role: 'GENERAL' }).subscribe({ error: () => undefined });
      http
        .expectOne(`${USERS}/meera.admin`)
        .flush(errorBody('SELF_ACTION'), { status: 409, statusText: 'Conflict' });

      expect(session.user()).toEqual(MEERA);
    });
  });
});
