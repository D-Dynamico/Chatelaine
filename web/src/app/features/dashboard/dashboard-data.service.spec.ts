import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { type RecordQuery } from '../../core/models/service-request';
import { type LoadState } from '../../shared/load-state/load-state';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { DashboardDataService } from './dashboard-data.service';

const ME = `${TEST_API_BASE}/me`;
const SUMMARY = `${TEST_API_BASE}/records/summary`;
const RECORDS = `${TEST_API_BASE}/records`;
const BASE_QUERY: RecordQuery = { page: 1, pageSize: 10, sort: 'createdAt', order: 'desc' };
const SUMMARY_BODY = {
  scope: 'OWN',
  total: 2,
  byStatus: { OPEN: 2, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
  byPriority: { LOW: 0, MEDIUM: 2, HIGH: 0, CRITICAL: 0 },
  byAccessLevel: { GENERAL: 2 },
};
const fail = { status: 503, statusText: 'Service Unavailable' };

function setUp() {
  TestBed.configureTestingModule({
    providers: [...provideTestHttp(), provideRouter([]), DashboardDataService],
  });
  const data = TestBed.inject(DashboardDataService);
  const http = TestBed.inject(HttpTestingController);
  const query = new BehaviorSubject<RecordQuery>(BASE_QUERY);
  const latest = <T>(source: { subscribe: (next: (value: T) => void) => unknown }) => {
    const box: { state?: T } = {};
    source.subscribe((value) => (box.state = value));
    return box;
  };
  return { data, http, query, latest };
}

describe('DashboardDataService', () => {
  it('loads the three panels independently: one failing leaves the others alone', () => {
    const { data, http, query, latest } = setUp();
    const profile = latest<LoadState<unknown>>(data.profile$);
    const summary = latest<LoadState<unknown>>(data.summary$);
    const records = latest<LoadState<unknown>>(data.records$(query));

    const pending = [ME, SUMMARY, RECORDS].map((url) => http.expectOne((req) => req.url === url));
    expect(pending).toHaveLength(3);

    pending[1]?.flush(errorBody('SIMULATED_FAILURE'), fail);
    expect(summary.state).toMatchObject({ status: 'error', error: { code: 'SIMULATED_FAILURE' } });
    expect(profile.state).toEqual({ status: 'loading' });

    pending[0]?.flush(RIYA);
    pending[2]?.flush({ items: [{ id: 'SR-1' }], page: 1, pageSize: 10, total: 1 });
    expect(profile.state).toMatchObject({ status: 'loaded', data: RIYA });
    expect(records.state).toMatchObject({ status: 'loaded', isRefreshing: false });
    http.verify();
  });

  it('reports an empty summary and an empty page as empty', () => {
    const { data, http, query, latest } = setUp();
    const summary = latest<LoadState<unknown>>(data.summary$);
    const records = latest<LoadState<unknown>>(data.records$(query));

    http.expectOne(SUMMARY).flush({ ...SUMMARY_BODY, total: 0 });
    http
      .expectOne((req) => req.url === RECORDS)
      .flush({ items: [], page: 1, pageSize: 10, total: 0 });

    expect(summary.state).toEqual({ status: 'empty', isRefreshing: false });
    expect(records.state).toEqual({ status: 'empty', isRefreshing: false });
  });

  it('cancels the first attempt when "Try again" is pressed twice', () => {
    const { data, http, latest } = setUp();
    const summary = latest<LoadState<unknown>>(data.summary$);
    http.expectOne(SUMMARY).flush(errorBody('SIMULATED_FAILURE'), fail);

    data.retrySummary();
    const first = http.expectOne(SUMMARY);
    data.retrySummary();
    const second = http.expectOne(SUMMARY);

    expect(first.cancelled).toBe(true);
    second.flush(SUMMARY_BODY);
    expect(summary.state).toMatchObject({ status: 'loaded' });
  });

  it('sends only the query fields that are set', () => {
    const { data, http, query } = setUp();
    data.records$(query).subscribe();
    http
      .expectOne((req) => req.url === RECORDS)
      .flush({ items: [], page: 1, pageSize: 10, total: 0 });

    query.next({ ...BASE_QUERY, page: 2, status: 'OPEN', accessLevel: undefined });
    const request = http.expectOne((req) => req.url === RECORDS);

    expect(request.request.params.keys().sort()).toEqual([
      'order',
      'page',
      'pageSize',
      'sort',
      'status',
    ]);
    expect(request.request.params.get('page')).toBe('2');
  });

  it('keeps the rows while the next page loads, and drops a stale request', () => {
    const { data, http, query, latest } = setUp();
    const records = latest<LoadState<unknown>>(data.records$(query));
    http
      .expectOne((req) => req.url === RECORDS)
      .flush({ items: [{ id: 'SR-1' }], page: 1, pageSize: 10, total: 30 });

    query.next({ ...BASE_QUERY, page: 2 });
    const pageTwo = http.expectOne((req) => req.params.get('page') === '2');
    expect(records.state).toMatchObject({ status: 'loaded', isRefreshing: true });

    query.next({ ...BASE_QUERY, page: 3 });
    expect(pageTwo.cancelled).toBe(true);
    http.expectOne((req) => req.params.get('page') === '3');
  });

  it('does not request again for an identical query', () => {
    const { data, http, query } = setUp();
    data.records$(query).subscribe();
    http.expectOne((req) => req.url === RECORDS);

    query.next({ ...BASE_QUERY });

    http.expectNone((req) => req.url === RECORDS);
  });
});
