import { HttpClient, type HttpInterceptorFn } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { SessionStore } from '../auth/session-store';
import { ApiError } from './api-error';
import { API_PATHS } from './api-paths';
import { apiUrlInterceptor } from './api-url-interceptor';
import { errorInterceptor } from './error-interceptor';
import { silentAuth } from './http-context-tokens';

describe('errorInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: SessionStore;
  let navigate: ReturnType<typeof vi.spyOn>;

  function setUp(inner: HttpInterceptorFn[] = []): void {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp([apiUrlInterceptor, errorInterceptor, ...inner]),
        provideRouter([]),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  }

  afterEach(() => {
    sessionStorage.clear();
  });

  it('maps the API error shape to ApiError', async () => {
    setUp();
    const failed = firstValueFrom(client.get(API_PATHS.records));

    http.expectOne(`${TEST_API_BASE}/records`).flush(
      {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'page must be at least 1',
          details: [{ path: 'page', message: 'Too small' }],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    const error: unknown = await failed.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'page must be at least 1',
      details: [{ path: 'page', message: 'Too small' }],
    });
  });

  it('names a network failure and a response that is not the API shape', async () => {
    setUp();
    const offline = firstValueFrom(client.get(API_PATHS.records));
    const garbled = firstValueFrom(client.get(API_PATHS.me));

    http.expectOne(`${TEST_API_BASE}/records`).error(new ProgressEvent('error'));
    http
      .expectOne(`${TEST_API_BASE}/me`)
      .flush('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' });

    await expect(offline).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    await expect(garbled).rejects.toMatchObject({ status: 502, code: 'UNEXPECTED_RESPONSE' });
  });

  it.each(['SESSION_INVALID', 'UNAUTHENTICATED'])(
    'on 401 %s clears the session and sends the user to sign in again',
    async (code) => {
      setUp();
      session.start('jwt', RIYA);
      const failed = firstValueFrom(client.get(API_PATHS.records));

      http
        .expectOne(`${TEST_API_BASE}/records`)
        .flush(errorBody(code), { status: 401, statusText: 'Unauthorized' });

      await expect(failed).rejects.toMatchObject({ code });
      expect(session.token()).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'expired', returnUrl: '/' },
      });
    },
  );

  it('leaves the session alone for a failed login', async () => {
    setUp();
    session.start('jwt', RIYA);
    const failed = firstValueFrom(client.post(API_PATHS.login, {}));

    http
      .expectOne(`${TEST_API_BASE}/auth/login`)
      .flush(errorBody('UNAUTHENTICATED'), { status: 401, statusText: 'Unauthorized' });

    await expect(failed).rejects.toMatchObject({ status: 401 });
    expect(session.token()).toBe('jwt');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the session alone for a SILENT_AUTH request', async () => {
    setUp();
    session.start('jwt', RIYA);
    const failed = firstValueFrom(client.get(API_PATHS.me, { context: silentAuth() }));

    http
      .expectOne(`${TEST_API_BASE}/me`)
      .flush(errorBody('SESSION_INVALID'), { status: 401, statusText: 'Unauthorized' });

    await expect(failed).rejects.toMatchObject({ code: 'SESSION_INVALID' });
    expect(session.token()).toBe('jwt');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('passes an ApiError from further in (a client timeout) through unchanged', async () => {
    const timedOut = new ApiError(0, 'CLIENT_TIMEOUT', 'The server took too long to respond.');
    setUp([() => throwError(() => timedOut)]);

    const error: unknown = await firstValueFrom(client.get(API_PATHS.records)).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(timedOut);
    expect(error).toMatchObject({ status: 0, code: 'CLIENT_TIMEOUT' });
  });
});
