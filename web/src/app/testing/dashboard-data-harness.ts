import { HttpTestingController, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LatencySettingsStore } from '../core/latency/latency-settings-store';
import { type LoadingStrategy } from '../core/latency/latency-settings';
import { type RecordQuery } from '../core/models/service-request';
import { TEST_API_BASE } from './fixtures';
import { provideTestHttp } from './http-testing';
import { DashboardDataService } from '../features/dashboard/dashboard-data.service';

/** The dashboard data service with a strategy and the table's query already supplied. */
export const ME = `${TEST_API_BASE}/me`;
export const SUMMARY = `${TEST_API_BASE}/records/summary`;
export const RECORDS = `${TEST_API_BASE}/records`;
export const BASE_QUERY: RecordQuery = { page: 1, pageSize: 10, sort: 'createdAt', order: 'desc' };
export const SUMMARY_BODY = {
  scope: 'OWN',
  total: 2,
  byStatus: { OPEN: 2, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
  byPriority: { LOW: 0, MEDIUM: 2, HIGH: 0, CRITICAL: 0 },
  byAccessLevel: { GENERAL: 2 },
};
export const pageOf = (total: number, page = 1) => ({
  items: total > 0 ? [{ id: `SR-${String(page)}` }] : [],
  page,
  pageSize: 10,
  total,
});
export const unavailable = { status: 503, statusText: 'Service Unavailable' };
export const isRecordsRequest = (req: { url: string }) => req.url === RECORDS;

/** The data service for a strategy, with the records table's query already supplied. */
export function setUp(strategy: LoadingStrategy = 'independent') {
  TestBed.configureTestingModule({
    providers: [...provideTestHttp(), provideRouter([]), DashboardDataService],
  });
  const settings = TestBed.inject(LatencySettingsStore);
  settings.setStrategy(strategy);
  const data = TestBed.inject(DashboardDataService);
  const http = TestBed.inject(HttpTestingController);
  data.setRecordsQuery(BASE_QUERY);
  /**
   * Requests still in flight, by panel. `match` takes what it returns off the list, and a
   * cancelled request stays on it, so cancelled ones are left out here.
   */
  const open = () => {
    const live = (requests: TestRequest[]) => requests.filter((request) => !request.cancelled);
    return {
      profile: live(http.match(ME)),
      summary: live(http.match(SUMMARY)),
      records: live(http.match(isRecordsRequest)),
    };
  };
  const expectOpen = (url: string | ((req: { url: string }) => boolean)): TestRequest =>
    http.expectOne(url);
  const reload = () => {
    settings.requestReload();
    TestBed.tick();
  };
  return { data, http, settings, open, expectOpen, reload };
}
