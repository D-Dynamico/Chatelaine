import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { SessionStore } from '../auth/session-store';
import { LatencySettingsStore } from '../latency/latency-settings-store';
import { type RequestLogEntry, RequestLogStore } from '../latency/request-log-store';
import { API_PATHS } from './api-paths';
import { parseServerTiming } from './server-timing';

/** Runs through the registered chain, so a change to the §17 order shows up here. */
describe('requestLogInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let log: RequestLogStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideTestHttp(), provideRouter([])] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    log = TestBed.inject(RequestLogStore);
    TestBed.inject(SessionStore).start('jwt', RIYA);
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  function onlyEntry(): RequestLogEntry {
    const [entry, ...rest] = log.entries();
    expect(rest).toHaveLength(0);
    if (!entry) throw new Error('Nothing was logged');
    return entry;
  }

  it('records a success with its status and Server-Timing split', () => {
    TestBed.inject(LatencySettingsStore).setDelay('records', 1500);
    client.get(API_PATHS.records, { params: { page: 1 } }).subscribe();

    expect(onlyEntry()).toMatchObject({ group: 'records', outcome: 'pending', endedAt: null });
    http
      .expectOne((req) => req.url === `${TEST_API_BASE}/records`)
      .flush({}, { headers: { 'Server-Timing': 'delay;dur=1500, app;dur=12' } });

    expect(onlyEntry()).toMatchObject({
      method: 'GET',
      url: '/records?page=1&delay=1500',
      outcome: 'ok',
      status: 200,
      serverDelayMs: 1500,
      serverWorkMs: 12,
    });
    expect(onlyEntry().endedAt).not.toBeNull();
  });

  it('records an API error with its status', () => {
    client.get(API_PATHS.summary).subscribe({ error: () => undefined });

    http.expectOne(`${TEST_API_BASE}/records/summary`).flush(errorBody('SIMULATED_FAILURE'), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Server-Timing': 'delay;dur=900, app;dur=1' },
    });

    expect(onlyEntry()).toMatchObject({
      group: 'summary',
      outcome: 'error',
      status: 503,
      serverDelayMs: 900,
    });
  });

  it('records an unsubscribe before the response as cancelled', () => {
    const subscription = client.get(API_PATHS.me).subscribe();
    const request = http.expectOne(`${TEST_API_BASE}/me`);

    subscription.unsubscribe();

    expect(request.cancelled).toBe(true);
    expect(onlyEntry()).toMatchObject({ group: 'profile', outcome: 'cancelled', status: null });
  });

  it('records a client timeout as timeout, not cancelled', () => {
    vi.useFakeTimers();
    TestBed.inject(LatencySettingsStore).setTimeoutMs(2_000);
    client.get(API_PATHS.records).subscribe({ error: () => undefined });
    http.expectOne(`${TEST_API_BASE}/records`);

    vi.advanceTimersByTime(2_000);

    expect(onlyEntry()).toMatchObject({ outcome: 'timeout', status: null });
  });

  it('leaves requests to other origins out of the timeline', () => {
    client.get('https://elsewhere.test/data').subscribe();
    http.expectOne('https://elsewhere.test/data').flush({});

    expect(log.entries()).toHaveLength(0);
  });
});

describe('parseServerTiming', () => {
  it('reads delay and app durations in any order, ignoring other metrics', () => {
    expect(parseServerTiming('app;dur=7.5, cache;desc="hit", delay;dur=300')).toEqual({
      serverDelayMs: 300,
      serverWorkMs: 7.5,
    });
  });

  it('gives nulls for a missing or malformed header', () => {
    expect(parseServerTiming(null)).toEqual({ serverDelayMs: null, serverWorkMs: null });
    expect(parseServerTiming('delay;dur=abc')).toEqual({ serverDelayMs: null, serverWorkMs: null });
  });
});
