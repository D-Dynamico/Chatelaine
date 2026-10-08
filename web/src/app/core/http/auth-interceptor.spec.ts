import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RIYA, TEST_API_BASE } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { SessionStore } from '../auth/session-store';
import { API_PATHS } from './api-paths';
import { apiUrlInterceptor } from './api-url-interceptor';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: provideTestHttp([apiUrlInterceptor, authInterceptor]),
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function authorizationOf(url: string): string | null {
    const request = http.expectOne((req) => req.url === url);
    const header = request.request.headers.get('Authorization');
    request.flush({});
    return header;
  }

  it('adds the bearer token when signed in', () => {
    session.start('jwt', RIYA);

    client.get(API_PATHS.records).subscribe();

    expect(authorizationOf(`${TEST_API_BASE}/records`)).toBe('Bearer jwt');
  });

  it('adds nothing without a token', () => {
    client.get(API_PATHS.me).subscribe();

    expect(authorizationOf(`${TEST_API_BASE}/me`)).toBeNull();
  });

  it('never sends the token to /health or /auth/login', () => {
    session.start('jwt', RIYA);

    client.get(API_PATHS.health).subscribe();
    client.post(API_PATHS.login, {}).subscribe();

    expect(authorizationOf(`${TEST_API_BASE}/health`)).toBeNull();
    expect(authorizationOf(`${TEST_API_BASE}/auth/login`)).toBeNull();
  });

  it('never sends the token to another origin', () => {
    session.start('jwt', RIYA);

    client.get('https://elsewhere.test/api/records').subscribe();

    expect(authorizationOf('https://elsewhere.test/api/records')).toBeNull();
  });
});
