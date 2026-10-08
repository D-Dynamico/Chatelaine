import { TestBed } from '@angular/core/testing';
import { REQUEST_LOG_LIMIT, RequestLogStore } from './request-log-store';

describe('RequestLogStore', () => {
  it('keeps only the most recent 40 entries, oldest first', () => {
    const log = TestBed.inject(RequestLogStore);

    for (let i = 0; i < REQUEST_LOG_LIMIT + 5; i++) {
      log.start({ group: 'records', method: 'GET', url: `/records?page=${String(i)}` });
    }

    const entries = log.entries();
    expect(entries).toHaveLength(REQUEST_LOG_LIMIT);
    expect(entries[0]?.url).toBe('/records?page=5');
    expect(entries.at(-1)?.url).toBe('/records?page=44');
  });

  it('finishes the matching entry only', () => {
    const log = TestBed.inject(RequestLogStore);
    const first = log.start({ group: 'profile', method: 'GET', url: '/me' });
    log.start({ group: 'summary', method: 'GET', url: '/records/summary' });

    log.finish(first, { outcome: 'ok', status: 200 });

    expect(log.entries().map((entry) => entry.outcome)).toEqual(['ok', 'pending']);
  });

  it('clears', () => {
    const log = TestBed.inject(RequestLogStore);
    log.start({ group: 'profile', method: 'GET', url: '/me' });

    log.clear();

    expect(log.entries()).toEqual([]);
  });
});
