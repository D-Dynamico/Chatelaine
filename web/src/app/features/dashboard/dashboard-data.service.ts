import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  type Observable,
  ReplaySubject,
  Subject,
  distinctUntilChanged,
  filter,
  map,
  merge,
  skip,
  startWith,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { UserService } from '../../core/auth/user.service';
import { API_PATHS } from '../../core/http/api-paths';
import { isSameQuery, toHttpParams } from '../../core/http/list-query';
import { LatencySettingsStore } from '../../core/latency/latency-settings-store';
import { type RecordQuery, type RecordSummary } from '../../core/models/service-request';
import { keepWhileRefreshing } from '../../shared/load-state/load-state';
import {
  ALL_LOADING,
  type DashboardRequests,
  type DashboardStates,
  type DashboardUpdate,
  type RecordsPage,
  loadWith,
  profileUpdates,
  recordsUpdates,
  summaryUpdates,
} from './dashboard-strategies';

type PanelName = keyof DashboardStates;

const SINGLE_PANEL_UPDATES: Readonly<
  Record<PanelName, (requests: DashboardRequests) => Observable<DashboardUpdate>>
> = {
  profile: profileUpdates,
  summary: summaryUpdates,
  records: recordsUpdates,
};

/**
 * The dashboard's three panels (§15, §19). Provided on the dashboard route, so it lives and
 * dies with the page. A *load* is the three requests for the records query the table is
 * showing, run the way the lab's strategy says: independently, all at once or one after
 * another. A load starts when the page opens and again on every "Reload dashboard"; a
 * reload cancels the one before it with `switchMap`, which the request timeline shows as
 * cancelled bars. Choosing a strategy only changes the next load.
 *
 * Paging, sorting and filtering the table reload only the table, whatever the strategy: a
 * strategy describes how the page loads, not each later interaction. Each panel keeps what
 * it shows while it refreshes, and "Try again" reloads one panel, except under "All at
 * once", where the three are one unit and reload together.
 */
@Injectable()
export class DashboardDataService {
  private readonly http = inject(HttpClient);
  private readonly users = inject(UserService);
  private readonly settings = inject(LatencySettingsStore);
  private readonly states = signal<DashboardStates>(ALL_LOADING);
  private readonly queries = new ReplaySubject<RecordQuery>(1);
  private readonly reloads = new Subject<void>();
  private readonly retries = new Subject<PanelName>();
  /**
   * Counts records requests asked for by the table. A load that started before the table
   * asked for another page must not put its older rows over the newer ones when it ends.
   */
  private recordsRequested = 0;

  readonly profile = computed(() => this.states().profile);
  readonly summary = computed(() => this.states().summary);
  readonly records = computed(() => this.states().records);

  constructor() {
    const query$ = this.queries.pipe(distinctUntilChanged<RecordQuery>(isSameQuery));
    const reloadedFromLab$ = this.reloadsFromLab();
    const loads$ = merge(reloadedFromLab$, this.reloads).pipe(startWith(undefined));

    // The load waits for the table's first query: its request depends on it.
    const load$ = loads$.pipe(
      switchMap(() => query$.pipe(take(1))),
      switchMap((query) => {
        const requested = this.recordsRequested;
        return loadWith(this.settings.strategy(), this.requests(query)).pipe(
          map((update) => (requested === this.recordsRequested ? update : withoutRecords(update))),
        );
      }),
    );

    // The first query belongs to the load; each later one reloads only the table.
    const page$ = query$.pipe(
      skip(1),
      tap(() => this.recordsRequested++),
      switchMap((query) => recordsUpdates(this.requests(query))),
    );

    const retry$ = merge(
      this.retriesFor('profile'),
      this.retriesFor('summary'),
      this.retriesFor('records'),
    );

    merge(load$, page$, retry$)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((update) => {
        this.apply(update);
      });
  }

  /** The records table's current query. An identical one is ignored. */
  setRecordsQuery(query: RecordQuery): void {
    this.queries.next(query);
  }

  retryProfile(): void {
    this.retry('profile');
  }

  retrySummary(): void {
    this.retry('summary');
  }

  retryRecords(): void {
    this.retry('records');
  }

  private retry(panel: PanelName): void {
    if (this.settings.strategy() === 'all-at-once') this.reloads.next();
    else this.retries.next(panel);
  }

  /** The lab's "Reload dashboard" (D34); changes are counted from the page's own start. */
  private reloadsFromLab(): Observable<void> {
    const countAtStart = this.settings.reloadRequested();
    return toObservable(this.settings.reloadRequested).pipe(
      filter((count) => count !== countAtStart),
      map(() => undefined),
    );
  }

  /** One panel on its own, cancelling its previous attempt when pressed twice. */
  private retriesFor(panel: PanelName): Observable<DashboardUpdate> {
    return this.retries.pipe(
      filter((retried) => retried === panel),
      switchMap(() => this.queries.pipe(take(1))),
      tap(() => {
        if (panel === 'records') this.recordsRequested++;
      }),
      switchMap((query) => SINGLE_PANEL_UPDATES[panel](this.requests(query))),
    );
  }

  private requests(query: RecordQuery): DashboardRequests {
    return {
      profile: this.users.getProfile(),
      summary: this.http.get<RecordSummary>(API_PATHS.summary),
      records: this.http.get<RecordsPage>(API_PATHS.records, { params: toHttpParams(query) }),
    };
  }

  private apply(update: DashboardUpdate): void {
    this.states.update((shown) => ({
      profile: update.profile ? keepWhileRefreshing(shown.profile, update.profile) : shown.profile,
      summary: update.summary ? keepWhileRefreshing(shown.summary, update.summary) : shown.summary,
      records: update.records ? keepWhileRefreshing(shown.records, update.records) : shown.records,
    }));
  }
}

function withoutRecords(update: DashboardUpdate): DashboardUpdate {
  return { profile: update.profile, summary: update.summary };
}
