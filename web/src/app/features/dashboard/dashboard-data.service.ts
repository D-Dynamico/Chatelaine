import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  type Observable,
  Subject,
  combineLatest,
  distinctUntilChanged,
  startWith,
  switchMap,
} from 'rxjs';
import { UserService } from '../../core/auth/user.service';
import { API_PATHS } from '../../core/http/api-paths';
import {
  type AdminRecordItem,
  type Page,
  type RecordItem,
  type RecordQuery,
  type RecordSummary,
} from '../../core/models/service-request';
import { type UserView } from '../../core/models/user';
import {
  type LoadState,
  keepDataWhileRefreshing,
  toLoadState,
} from '../../shared/load-state/load-state';

export type RecordsPage = Page<RecordItem | AdminRecordItem>;

function sameQuery(a: RecordQuery, b: RecordQuery): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toParams(query: RecordQuery): HttpParams {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined);
  return new HttpParams({ fromObject: Object.fromEntries(entries) });
}

/**
 * The dashboard's three data streams (§15). Provided on the dashboard route, so it lives
 * and dies with the page. Each panel loads on its own: one slow or failing call never
 * holds up another. Each has its own retry, and `switchMap` means a second "Try again"
 * cancels the first attempt instead of racing it (§18).
 */
@Injectable()
export class DashboardDataService {
  private readonly http = inject(HttpClient);
  private readonly users = inject(UserService);
  private readonly profileRetries = new Subject<void>();
  private readonly summaryRetries = new Subject<void>();
  private readonly recordsRetries = new Subject<void>();

  readonly profile$: Observable<LoadState<UserView>> = this.profileRetries.pipe(
    startWith(undefined),
    switchMap(() => this.users.getProfile().pipe(toLoadState())),
    keepDataWhileRefreshing(),
  );

  readonly summary$: Observable<LoadState<RecordSummary>> = this.summaryRetries.pipe(
    startWith(undefined),
    switchMap(() =>
      this.http
        .get<RecordSummary>(API_PATHS.summary)
        .pipe(toLoadState((summary) => summary.total === 0)),
    ),
    keepDataWhileRefreshing(),
  );

  /** Reloads whenever the query changes; paging and sorting keep the rows on screen. */
  records$(query$: Observable<RecordQuery>): Observable<LoadState<RecordsPage>> {
    return combineLatest([
      query$.pipe(distinctUntilChanged(sameQuery)),
      this.recordsRetries.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([query]) =>
        this.http
          .get<RecordsPage>(API_PATHS.records, { params: toParams(query) })
          // Empty means nothing matches; a page past the end still has a total (§20).
          .pipe(toLoadState((page) => page.total === 0)),
      ),
      keepDataWhileRefreshing(),
    );
  }

  retryProfile(): void {
    this.profileRetries.next();
  }

  retrySummary(): void {
    this.summaryRetries.next();
  }

  retryRecords(): void {
    this.recordsRetries.next();
  }
}
