import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_API_BASE } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { LatencySettingsStore } from '../latency/latency-settings-store';
import { type ApiError } from './api-error';
import { API_PATHS } from './api-paths';
import { apiUrlInterceptor } from './api-url-interceptor';
import { timeoutInterceptor } from './timeout-interceptor';

describe('timeoutInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: provideTestHttp([apiUrlInterceptor, timeoutInterceptor]),
    });
    TestBed.inject(LatencySettingsStore).setTimeoutMs(5_000);
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('emits CLIENT_TIMEOUT once the configured time passes without a response', () => {
    let failure: ApiError | undefined;
    client.get(API_PATHS.records).subscribe({
      error: (error: ApiError) => (failure = error),
    });
    const request = http.expectOne(`${TEST_API_BASE}/records`);

    vi.advanceTimersByTime(4_999);
    expect(failure).toBeUndefined();
    vi.advanceTimersByTime(1);

    expect(failure).toMatchObject({ status: 0, code: 'CLIENT_TIMEOUT' });
    expect(request.cancelled).toBe(true);
  });

  it('lets a response inside the limit through', () => {
    let body: unknown;
    client.get(API_PATHS.records).subscribe((received) => (body = received));

    vi.advanceTimersByTime(4_000);
    http.expectOne(`${TEST_API_BASE}/records`).flush({ items: [] });

    expect(body).toEqual({ items: [] });
  });
});
