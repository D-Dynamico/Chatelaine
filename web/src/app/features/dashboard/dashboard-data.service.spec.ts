import { TestBed } from '@angular/core/testing';
import { RIYA, errorBody } from '../../testing/fixtures';
import {
  BASE_QUERY,
  ME,
  SUMMARY,
  SUMMARY_BODY,
  isRecordsRequest,
  pageOf,
  setUp,
  unavailable,
} from '../../testing/dashboard-data-harness';

describe('DashboardDataService', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  describe('independent', () => {
    it('sends all three at once, and one failing leaves the others alone', () => {
      const { data, expectOpen } = setUp();
      const profile = expectOpen(ME);
      const summary = expectOpen(SUMMARY);
      const records = expectOpen(isRecordsRequest);

      summary.flush(errorBody('SIMULATED_FAILURE'), unavailable);
      expect(data.summary()).toMatchObject({
        status: 'error',
        error: { code: 'SIMULATED_FAILURE' },
      });
      expect(data.profile()).toEqual({ status: 'loading' });

      profile.flush(RIYA);
      records.flush(pageOf(1));
      expect(data.profile()).toMatchObject({ status: 'loaded', data: RIYA });
      expect(data.records()).toMatchObject({ status: 'loaded', isRefreshing: false });
    });

    it('reports an empty summary and an empty page as empty', () => {
      const { data, expectOpen } = setUp();
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush({ ...SUMMARY_BODY, total: 0 });
      expectOpen(isRecordsRequest).flush(pageOf(0));

      expect(data.summary()).toEqual({ status: 'empty', isRefreshing: false });
      expect(data.records()).toEqual({ status: 'empty', isRefreshing: false });
    });
  });

  describe('reload', () => {
    it('cancels the requests still in flight and starts the load again', () => {
      const { data, open, expectOpen, reload } = setUp();
      const first = [expectOpen(ME), expectOpen(SUMMARY), expectOpen(isRecordsRequest)];

      reload();

      expect(first.every((request) => request.cancelled)).toBe(true);
      const again = open();
      expect([again.profile.length, again.summary.length, again.records.length]).toEqual([1, 1, 1]);
      expect(data.profile()).toEqual({ status: 'loading' });
    });

    it('a second reload cancels the first reload too', () => {
      const { expectOpen, reload } = setUp();
      expectOpen(ME);
      expectOpen(SUMMARY);
      expectOpen(isRecordsRequest);
      reload();
      const firstReload = [expectOpen(ME), expectOpen(SUMMARY), expectOpen(isRecordsRequest)];

      reload();

      expect(firstReload.every((request) => request.cancelled)).toBe(true);
    });

    it('keeps what is on screen, marked as refreshing, while it loads again', () => {
      const { data, expectOpen, reload } = setUp();
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush(SUMMARY_BODY);
      expectOpen(isRecordsRequest).flush(pageOf(1));

      reload();

      expect(data.profile()).toMatchObject({ status: 'loaded', isRefreshing: true });
      expect(data.records()).toMatchObject({ status: 'loaded', isRefreshing: true });
    });

    it('uses the strategy chosen since the last load, and a change alone sends nothing', () => {
      const { settings, data, open, expectOpen, reload } = setUp();
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush(SUMMARY_BODY);
      expectOpen(isRecordsRequest).flush(pageOf(1));

      settings.setStrategy('sequential');
      TestBed.tick();
      expect(data.profile()).toMatchObject({ isRefreshing: false });
      const none = open();
      expect([none.profile.length, none.summary.length, none.records.length]).toEqual([0, 0, 0]);

      reload();
      const next = open();
      expect([next.profile.length, next.summary.length, next.records.length]).toEqual([1, 0, 0]);
    });
  });

  describe('retry', () => {
    it('cancels the first attempt when "Try again" is pressed twice', () => {
      const { data, expectOpen } = setUp();
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush(errorBody('SIMULATED_FAILURE'), unavailable);
      expectOpen(isRecordsRequest).flush(pageOf(1));

      data.retrySummary();
      const first = expectOpen(SUMMARY);
      data.retrySummary();
      const second = expectOpen(SUMMARY);

      expect(first.cancelled).toBe(true);
      second.flush(SUMMARY_BODY);
      expect(data.summary()).toMatchObject({ status: 'loaded' });
    });
  });

  describe('records query', () => {
    it('sends only the query fields that are set', () => {
      const { data, expectOpen } = setUp();
      expectOpen(isRecordsRequest).flush(pageOf(0));

      data.setRecordsQuery({ ...BASE_QUERY, page: 2, status: 'OPEN', accessLevel: undefined });
      const request = expectOpen(isRecordsRequest);

      expect(request.request.params.keys().sort()).toEqual([
        'order',
        'page',
        'pageSize',
        'sort',
        'status',
      ]);
      expect(request.request.params.get('page')).toBe('2');
    });

    it('does not request again for an identical query', () => {
      const { data, http, expectOpen } = setUp();
      expectOpen(isRecordsRequest);

      data.setRecordsQuery({ ...BASE_QUERY });

      http.expectNone(isRecordsRequest);
    });

    it('reloads only the table, under every strategy', () => {
      for (const strategy of ['independent', 'all-at-once', 'sequential'] as const) {
        TestBed.resetTestingModule();
        const { data, open, expectOpen } = setUp(strategy);
        expectOpen(ME).flush(RIYA);
        expectOpen(SUMMARY).flush(SUMMARY_BODY);
        expectOpen(isRecordsRequest).flush(pageOf(30));

        data.setRecordsQuery({ ...BASE_QUERY, page: 2 });

        const requests = open();
        expect([requests.profile.length, requests.summary.length, requests.records.length]).toEqual(
          [0, 0, 1],
        );
        expect(data.profile()).toMatchObject({ status: 'loaded', isRefreshing: false });
        expect(data.records()).toMatchObject({ status: 'loaded', isRefreshing: true });
      }
    });

    it('keeps the rows while the next page loads, and drops a stale request', () => {
      const { data, expectOpen } = setUp();
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush(SUMMARY_BODY);
      expectOpen(isRecordsRequest).flush(pageOf(30));

      data.setRecordsQuery({ ...BASE_QUERY, page: 2 });
      const pageTwo = expectOpen(isRecordsRequest);
      data.setRecordsQuery({ ...BASE_QUERY, page: 3 });

      expect(pageTwo.cancelled).toBe(true);
      expectOpen(isRecordsRequest).flush(pageOf(30, 3));
      expect(data.records()).toMatchObject({ status: 'loaded', isRefreshing: false });
    });

    it("never lets the first load's records overwrite a page asked for after it", () => {
      const { data, expectOpen } = setUp();
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush(SUMMARY_BODY);
      const firstLoad = expectOpen(isRecordsRequest);

      data.setRecordsQuery({ ...BASE_QUERY, page: 2 });
      const pageTwo = expectOpen(isRecordsRequest);
      pageTwo.flush(pageOf(30, 2));
      firstLoad.flush(pageOf(30, 1));

      expect(data.records()).toMatchObject({
        status: 'loaded',
        data: { page: 2 },
      });
    });
  });
});
