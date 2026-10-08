import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { endpointGroupOf } from './endpoint-group';
import { INITIAL_SETTINGS } from './latency-settings';
import { LatencySettingsStore } from './latency-settings-store';

describe('LatencySettingsStore', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('starts with no delay, independent loading and a 12 s timeout', () => {
    const settings = TestBed.inject(LatencySettingsStore);

    expect(settings.delays()).toEqual(INITIAL_SETTINGS.delays);
    expect(settings.strategy()).toBe('independent');
    expect(settings.timeoutMs()).toBe(12_000);
  });

  it('arms a failure for exactly one request', () => {
    const settings = TestBed.inject(LatencySettingsStore);

    settings.armFailure('records', true);

    expect(settings.takeFailure('summary')).toBe(false);
    expect(settings.takeFailure('records')).toBe(true);
    expect(settings.takeFailure('records')).toBe(false);
    expect(settings.armedFailures().size).toBe(0);
  });

  it('refuses values the API or the lab would reject', () => {
    const settings = TestBed.inject(LatencySettingsStore);

    expect(() => {
      settings.setDelay('records', 10_001);
    }).toThrow(RangeError);
    expect(() => {
      settings.setTimeoutMs(1_000);
    }).toThrow(RangeError);
  });

  /** Armed failures persist since Stage 4, so a reload can be failed on purpose. */
  it('keeps every setting for the tab, armed failures included', () => {
    const first = TestBed.inject(LatencySettingsStore);
    first.setDelay('summary', 900);
    first.setStrategy('sequential');
    first.setTimeoutMs(5_000);
    first.armFailure('profile', true);

    TestBed.resetTestingModule();
    const second = TestBed.inject(LatencySettingsStore);

    expect(second.delays().summary).toBe(900);
    expect(second.strategy()).toBe('sequential');
    expect(second.timeoutMs()).toBe(5_000);
    expect([...second.armedFailures()]).toEqual(['profile']);
  });

  it('forgets a failure once a request has taken it, across a reload too', () => {
    const first = TestBed.inject(LatencySettingsStore);
    first.armFailure('records', true);
    expect(first.takeFailure('records')).toBe(true);

    TestBed.resetTestingModule();

    expect(TestBed.inject(LatencySettingsStore).takeFailure('records')).toBe(false);
  });

  it('keeps only known groups from a damaged armed list', () => {
    sessionStorage.setItem(
      STORAGE_KEYS.latency,
      JSON.stringify({ armedFailures: ['summary', 'health', 7, 'summary'] }),
    );

    expect([...TestBed.inject(LatencySettingsStore).armedFailures()]).toEqual(['summary']);
  });

  it('falls back field by field when saved settings are damaged', () => {
    sessionStorage.setItem(
      STORAGE_KEYS.latency,
      JSON.stringify({ delays: { profile: 300, records: -5 }, strategy: 'warp', timeoutMs: 6000 }),
    );

    const settings = TestBed.inject(LatencySettingsStore);

    expect(settings.delays()).toEqual({ profile: 300, summary: 0, records: 0, admin: 0 });
    expect(settings.strategy()).toBe('independent');
    expect(settings.timeoutMs()).toBe(6_000);
  });

  it('ignores saved text that is not JSON', () => {
    sessionStorage.setItem(STORAGE_KEYS.latency, '{not json');

    expect(TestBed.inject(LatencySettingsStore).delays()).toEqual(INITIAL_SETTINGS.delays);
  });

  it('counts reload requests', () => {
    const settings = TestBed.inject(LatencySettingsStore);

    settings.requestReload();
    settings.requestReload();

    expect(settings.reloadRequested()).toBe(2);
  });
});

describe('endpointGroupOf', () => {
  it.each([
    ['/auth/login', 'auth'],
    ['/me', 'profile'],
    ['/records/summary', 'summary'],
    ['/records', 'records'],
    ['/admin/users/riya', 'admin'],
    ['/health', 'health'],
    ['/nowhere', null],
  ])('%s is %s', (path, group) => {
    expect(endpointGroupOf(path)).toBe(group);
  });
});
