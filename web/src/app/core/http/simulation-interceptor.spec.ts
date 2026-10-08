import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_API_BASE } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { LatencySettingsStore } from '../latency/latency-settings-store';
import { API_PATHS } from './api-paths';
import { apiUrlInterceptor } from './api-url-interceptor';
import { simulationInterceptor } from './simulation-interceptor';

describe('simulationInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let settings: LatencySettingsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: provideTestHttp([apiUrlInterceptor, simulationInterceptor]),
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    settings = TestBed.inject(LatencySettingsStore);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function paramsOf(url: string): Record<string, string | null> {
    const request = http.expectOne((req) => req.url === url);
    const { params } = request.request;
    request.flush({});
    return { delay: params.get('delay'), fail: params.get('fail'), page: params.get('page') };
  }

  it("appends the group's delay and keeps the request's own params", () => {
    settings.setDelay('records', 1600);
    settings.setDelay('summary', 900);

    client.get(API_PATHS.records, { params: { page: 2 } }).subscribe();
    client.get(API_PATHS.summary).subscribe();

    expect(paramsOf(`${TEST_API_BASE}/records`)).toEqual({ delay: '1600', fail: null, page: '2' });
    expect(paramsOf(`${TEST_API_BASE}/records/summary`)).toMatchObject({ delay: '900' });
  });

  it('sends no delay param at zero', () => {
    client.get(API_PATHS.me).subscribe();

    expect(paramsOf(`${TEST_API_BASE}/me`)).toMatchObject({ delay: null });
  });

  it('adds fail=true once, then disarms', () => {
    settings.armFailure('profile', true);

    client.get(API_PATHS.me).subscribe();
    expect(paramsOf(`${TEST_API_BASE}/me`)).toMatchObject({ fail: 'true' });

    client.get(API_PATHS.me).subscribe();
    expect(paramsOf(`${TEST_API_BASE}/me`)).toMatchObject({ fail: null });
    expect(settings.armedFailures().has('profile')).toBe(false);
  });

  it('never touches /health or login', () => {
    settings.setDelay('profile', 500);
    settings.setDelay('records', 500);

    client.get(API_PATHS.health).subscribe();
    client.post(API_PATHS.login, {}).subscribe();

    expect(paramsOf(`${TEST_API_BASE}/health`)).toMatchObject({ delay: null, fail: null });
    expect(paramsOf(`${TEST_API_BASE}/auth/login`)).toMatchObject({ delay: null, fail: null });
  });
});
