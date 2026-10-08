import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { AuthService } from './auth.service';
import { SessionStore } from './session-store';

describe('AuthService', () => {
  let auth: AuthService;
  let session: SessionStore;
  let http: HttpTestingController;

  function setUp(): void {
    TestBed.configureTestingModule({ providers: [...provideTestHttp(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
    session = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('login stores the token and the user', async () => {
    setUp();
    const signedIn = firstValueFrom(
      auth.login({ userId: 'riya', password: 'pw', role: 'GENERAL' }),
    );

    const request = http.expectOne(`${TEST_API_BASE}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 'riya', password: 'pw', role: 'GENERAL' });
    request.flush({ token: 'jwt', expiresAt: '2026-10-08T12:00:00.000Z', user: RIYA });

    await expect(signedIn).resolves.toEqual(RIYA);
    expect(session.user()).toEqual(RIYA);
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('jwt');
  });

  it('a failed login leaves no session and reports the API error', async () => {
    setUp();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const signedIn = firstValueFrom(
      auth.login({ userId: 'riya', password: 'wrong', role: 'GENERAL' }),
    );

    http
      .expectOne(`${TEST_API_BASE}/auth/login`)
      .flush(errorBody('INVALID_CREDENTIALS'), { status: 401, statusText: 'Unauthorized' });

    await expect(signedIn).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(session.isSignedIn()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logout clears the token and the user', () => {
    setUp();
    session.start('jwt', RIYA);

    auth.logout();

    expect(session.user()).toBeNull();
    expect(session.token()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBeNull();
  });

  it('restore with a valid token fills the session from /me', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'jwt');
    setUp();
    const restored = firstValueFrom(auth.restore());

    const request = http.expectOne(`${TEST_API_BASE}/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt');
    request.flush(RIYA);

    await restored;
    expect(session.isSignedIn()).toBe(true);
    expect(session.user()).toEqual(RIYA);
  });

  it('restore with a rejected token clears it, without failing or navigating', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'stale');
    setUp();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const restored = firstValueFrom(auth.restore());

    http
      .expectOne(`${TEST_API_BASE}/me`)
      .flush(errorBody('SESSION_INVALID'), { status: 401, statusText: 'Unauthorized' });

    await expect(restored).resolves.toBeUndefined();
    expect(session.token()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('restore keeps the token when the server fails for another reason', async () => {
    sessionStorage.setItem(STORAGE_KEYS.token, 'jwt');
    setUp();
    const restored = firstValueFrom(auth.restore());

    http
      .expectOne(`${TEST_API_BASE}/me`)
      .flush(errorBody('INTERNAL'), { status: 500, statusText: 'Server Error' });

    await expect(restored).resolves.toBeUndefined();
    expect(session.isSignedIn()).toBe(false);
    expect(session.token()).toBe('jwt');
  });

  it('restore without a token makes no request', async () => {
    setUp();

    await firstValueFrom(auth.restore());

    http.expectNone(`${TEST_API_BASE}/me`);
  });
});
