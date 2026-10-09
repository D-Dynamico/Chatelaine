import { type Observable, catchError, concat, forkJoin, map, merge, of, startWith } from 'rxjs';
import { type LoadingStrategy } from '../../core/latency/latency-settings';
import { type Page } from '../../core/models/paging';
import {
  type AdminRecordItem,
  type RecordItem,
  type RecordSummary,
} from '../../core/models/service-request';
import { type UserView } from '../../core/models/user';
import {
  type LoadState,
  failedState,
  settledState,
  toLoadState,
} from '../../shared/load-state/load-state';

export type RecordsPage = Page<RecordItem | AdminRecordItem>;

/** The dashboard's three panels, in the order "One after another" loads them (§19). */
export interface DashboardStates {
  readonly profile: LoadState<UserView>;
  readonly summary: LoadState<RecordSummary>;
  readonly records: LoadState<RecordsPage>;
}

/** What a load reports as it goes: any of the panels' new states. */
export type DashboardUpdate = Partial<DashboardStates>;

/** The three requests of one load. They are cold: nothing is sent until a strategy subscribes. */
export interface DashboardRequests {
  readonly profile: Observable<UserView>;
  readonly summary: Observable<RecordSummary>;
  readonly records: Observable<RecordsPage>;
}

export const ALL_LOADING: DashboardStates = {
  profile: { status: 'loading' },
  summary: { status: 'loading' },
  records: { status: 'loading' },
};

/** Empty means nothing matches; a page past the end still has a total (§20). */
export const isEmptySummary = (summary: RecordSummary): boolean => summary.total === 0;
export const isEmptyPage = (page: RecordsPage): boolean => page.total === 0;

export const profileUpdates = (requests: DashboardRequests): Observable<DashboardUpdate> =>
  requests.profile.pipe(
    toLoadState(),
    map((profile) => ({ profile })),
  );

export const summaryUpdates = (requests: DashboardRequests): Observable<DashboardUpdate> =>
  requests.summary.pipe(
    toLoadState(isEmptySummary),
    map((summary) => ({ summary })),
  );

export const recordsUpdates = (requests: DashboardRequests): Observable<DashboardUpdate> =>
  requests.records.pipe(
    toLoadState(isEmptyPage),
    map((records) => ({ records })),
  );

/** Three streams, each panel rendering as soon as its own data arrives (the default). */
function independent(requests: DashboardRequests): Observable<DashboardUpdate> {
  return merge(profileUpdates(requests), summaryUpdates(requests), recordsUpdates(requests));
}

/**
 * `forkJoin`: nothing renders until the slowest call finishes, and one failure fails all
 * three, because they are one unit. `forkJoin` itself fails fast, so the calls still
 * running are cancelled, which the timeline shows.
 */
function allAtOnce(requests: DashboardRequests): Observable<DashboardUpdate> {
  return forkJoin([requests.profile, requests.summary, requests.records]).pipe(
    map(([profile, summary, records]): DashboardUpdate => ({
      profile: settledState(profile),
      summary: settledState(summary, isEmptySummary),
      records: settledState(records, isEmptyPage),
    })),
    catchError((error: unknown) =>
      of<DashboardUpdate>({
        profile: failedState<UserView>(error),
        summary: failedState<RecordSummary>(error),
        records: failedState<RecordsPage>(error),
      }),
    ),
    startWith<DashboardUpdate>(ALL_LOADING),
  );
}

/**
 * `concat`: profile, then summary, then records, each sent only after the one before has
 * finished. A failed step does not stop the rest: each request becomes a state, so the
 * chain carries on. The point of this strategy is the waiting, not the error handling.
 */
function oneAfterAnother(requests: DashboardRequests): Observable<DashboardUpdate> {
  return concat(profileUpdates(requests), summaryUpdates(requests), recordsUpdates(requests)).pipe(
    startWith<DashboardUpdate>(ALL_LOADING),
  );
}

export function loadWith(
  strategy: LoadingStrategy,
  requests: DashboardRequests,
): Observable<DashboardUpdate> {
  switch (strategy) {
    case 'independent':
      return independent(requests);
    case 'all-at-once':
      return allAtOnce(requests);
    case 'sequential':
      return oneAfterAnother(requests);
  }
}
