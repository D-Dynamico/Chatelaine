import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { SessionStore } from '../../core/auth/session-store';
import {
  ACCESS_LEVELS,
  ACCESS_LEVEL_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  REQUEST_STATUSES,
  STATUS_LABELS,
} from '../../core/models/service-request';
import { injectUrlQuery } from '../../core/routing/url-query';
import { Clock } from '../../core/time/clock';
import { dataOf, failureOf, isRefreshing } from '../../shared/load-state/load-state';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { RangeLabelIntl } from '../../shared/ui/range-label-intl';
import { SearchShortcut } from '../../shared/ui/search-shortcut';
import { Skeleton } from '../../shared/ui/skeleton';
import { DashboardDataService } from './dashboard-data.service';
import { RECORDS_QUERY, type RecordsUrlState, hasFilters, toRecordQuery } from './records-query';
import { RecordsTable, type TableSort } from './records-table';

export const SEARCH_DEBOUNCE_MS = 300;

export const RECORDS_MESSAGES = {
  noneRaised: "You haven't raised any requests.",
  noneAtAll: 'No requests yet.',
  noneMatch: 'No requests match these filters.',
  failed: "Couldn't load requests.",
} as const;

const options = <V extends string>(values: readonly V[], labels: Readonly<Record<V, string>>) =>
  values.map((value) => ({ value, label: labels[value] }));

/**
 * The records panel: owns the query (in the URL) and the data, and hands rows to the
 * presentational table. Paging and sorting keep the rows up with a progress line; only
 * the first load shows the skeleton (§18).
 */
@Component({
  selector: 'app-records-panel',
  imports: [
    EmptyState,
    ErrorState,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    ReactiveFormsModule,
    RecordsTable,
    SearchShortcut,
    Skeleton,
  ],
  templateUrl: './records-panel.html',
  styleUrl: './records-panel.scss',
  providers: [{ provide: MatPaginatorIntl, useClass: RangeLabelIntl }],
  host: { class: 'panel', '[attr.aria-busy]': "state().status === 'loading'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsPanel {
  private readonly data = inject(DashboardDataService);
  protected readonly isAdmin = inject(SessionStore).isAdmin;
  protected readonly now = inject(Clock).now;
  protected readonly query = injectUrlQuery(RECORDS_QUERY, 'page');
  protected readonly search = new FormControl(this.query.values().q ?? '', { nonNullable: true });

  private readonly recordQuery = computed(() => toRecordQuery(this.query.values(), this.isAdmin()));
  protected readonly state = this.data.records;

  protected readonly page = computed(() => dataOf(this.state()));
  protected readonly failure = computed(() => failureOf(this.state()));
  protected readonly isRefreshing = computed(() => isRefreshing(this.state()));
  protected readonly sort = computed<TableSort>(() => ({
    field: this.query.values().sort,
    order: this.query.values().order,
  }));
  protected readonly emptyMessage = computed(() => {
    if (hasFilters(this.query.values(), this.isAdmin())) return RECORDS_MESSAGES.noneMatch;
    return this.isAdmin() ? RECORDS_MESSAGES.noneAtAll : RECORDS_MESSAGES.noneRaised;
  });
  protected readonly isFiltered = computed(() => hasFilters(this.query.values(), this.isAdmin()));

  protected readonly messages = RECORDS_MESSAGES;
  protected readonly statusOptions = options(REQUEST_STATUSES, STATUS_LABELS);
  protected readonly priorityOptions = options(PRIORITIES, PRIORITY_LABELS);
  protected readonly accessOptions = options(ACCESS_LEVELS, ACCESS_LEVEL_LABELS);

  constructor() {
    this.search.valueChanges
      .pipe(
        map((text) => text.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((text) => {
        this.query.update({ q: text === '' ? undefined : text }, { isTyping: true });
      });

    // The service loads the table for whatever the URL asks for, and again when it changes.
    effect(() => {
      this.data.setRecordsQuery(this.recordQuery());
    });

    // The box follows the URL when q changes from outside it (Back, or Clear filters).
    effect(() => {
      const q = this.query.values().q ?? '';
      if (this.search.value.trim() !== q) this.search.setValue(q, { emitEvent: false });
    });

    // A page past the end (an old link, or rows deleted since) moves to the last page.
    effect(() => {
      const page = this.page();
      if (page?.items.length === 0 && page.total > 0) {
        this.query.update({ page: Math.ceil(page.total / page.pageSize) });
      }
    });
  }

  protected filter(change: Partial<RecordsUrlState>): void {
    this.query.update(change);
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.query.update({ q: undefined, status: undefined, priority: undefined, access: undefined });
  }

  protected changeSort(sort: TableSort | null): void {
    this.query.update(
      sort ? { sort: sort.field, order: sort.order } : { sort: 'createdAt', order: 'desc' },
    );
  }

  protected changePage(page: number): void {
    this.query.update({ page });
  }

  protected retry(): void {
    this.data.retryRecords();
  }
}
