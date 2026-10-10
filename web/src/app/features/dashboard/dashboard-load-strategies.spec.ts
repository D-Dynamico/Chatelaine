import { RIYA, errorBody } from '../../testing/fixtures';
import {
  ME,
  SUMMARY,
  SUMMARY_BODY,
  isRecordsRequest,
  pageOf,
  setUp,
  unavailable,
} from '../../testing/dashboard-data-harness';

describe('DashboardDataService loading strategies', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  describe('all at once', () => {
    it('shows nothing until the slowest call finishes', () => {
      const { data, expectOpen } = setUp('all-at-once');
      const profile = expectOpen(ME);
      const summary = expectOpen(SUMMARY);
      const records = expectOpen(isRecordsRequest);

      profile.flush(RIYA);
      summary.flush(SUMMARY_BODY);
      expect(data.profile()).toEqual({ status: 'loading' });
      expect(data.summary()).toEqual({ status: 'loading' });
      expect(data.records()).toEqual({ status: 'loading' });

      records.flush(pageOf(1));
      expect(data.profile()).toMatchObject({ status: 'loaded', data: RIYA });
      expect(data.summary()).toMatchObject({ status: 'loaded' });
      expect(data.records()).toMatchObject({ status: 'loaded' });
    });

    it('fails all three when any one fails', () => {
      const { data, expectOpen } = setUp('all-at-once');
      const profile = expectOpen(ME);
      const summary = expectOpen(SUMMARY);
      const records = expectOpen(isRecordsRequest);

      summary.flush(errorBody('SIMULATED_FAILURE'), unavailable);

      for (const state of [data.profile(), data.summary(), data.records()]) {
        expect(state).toMatchObject({ status: 'error', error: { code: 'SIMULATED_FAILURE' } });
      }
      expect(profile.cancelled).toBe(true);
      expect(records.cancelled).toBe(true);
    });

    it('"Try again" on any panel reloads all three', () => {
      const { data, open, expectOpen } = setUp('all-at-once');
      expectOpen(ME);
      expectOpen(isRecordsRequest);
      expectOpen(SUMMARY).flush(errorBody('SIMULATED_FAILURE'), unavailable);

      data.retryProfile();

      const requests = open();
      expect(requests.profile).toHaveLength(1);
      expect(requests.summary).toHaveLength(1);
      expect(requests.records).toHaveLength(1);
    });
  });

  describe('one after another', () => {
    it('sends profile, then summary, then records, each only after the last finished', () => {
      const { data, http, expectOpen } = setUp('sequential');
      http.expectNone(SUMMARY);
      http.expectNone(isRecordsRequest);
      expect(data.records()).toEqual({ status: 'loading' });

      expectOpen(ME).flush(RIYA);
      expect(data.profile()).toMatchObject({ status: 'loaded' });
      http.expectNone(isRecordsRequest);

      expectOpen(SUMMARY).flush(SUMMARY_BODY);
      expectOpen(isRecordsRequest).flush(pageOf(1));
      expect(data.records()).toMatchObject({ status: 'loaded' });
    });

    it('carries on after a failed step, so the later panels still load', () => {
      const { data, expectOpen } = setUp('sequential');
      expectOpen(ME).flush(RIYA);

      expectOpen(SUMMARY).flush(errorBody('SIMULATED_FAILURE'), unavailable);
      expectOpen(isRecordsRequest).flush(pageOf(1));

      expect(data.summary()).toMatchObject({ status: 'error' });
      expect(data.records()).toMatchObject({ status: 'loaded' });
    });

    it('"Try again" reloads only the panel that failed', () => {
      const { data, open, expectOpen } = setUp('sequential');
      expectOpen(ME).flush(RIYA);
      expectOpen(SUMMARY).flush(errorBody('SIMULATED_FAILURE'), unavailable);
      expectOpen(isRecordsRequest).flush(pageOf(1));

      data.retrySummary();

      const requests = open();
      expect(requests.summary).toHaveLength(1);
      expect(requests.profile).toHaveLength(0);
      expect(requests.records).toHaveLength(0);
    });
  });
});
