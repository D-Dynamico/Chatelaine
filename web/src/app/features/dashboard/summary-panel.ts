import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  ACCESS_LEVELS,
  type Priority,
  type RecordSummary,
  type RequestStatus,
} from '../../core/models/service-request';
import { type LoadState, dataOf, failureOf } from '../../shared/load-state/load-state';
import { AccessChip } from '../../shared/ui/access-chip';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { Skeleton } from '../../shared/ui/skeleton';
import { STATUS_ORDER, accessDisplay, statusDisplay } from './record-display';

/** A filter the summary asks the records table to apply; `undefined` clears that key. */
export interface SummaryFilter {
  readonly status?: RequestStatus;
  readonly priority?: Priority;
}

function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * One strip rather than a grid of stat cards (§21): the total, a bar split by status in
 * workflow order, the counts, and the critical ones. Admins also see the split by access
 * level; a General User's summary has no Admin-level key to show (§11).
 *
 * Each count is also a filter for the table below (§40): a number you can see is a number
 * you can open. Pressing the active one again clears it. The strip only reports the pick;
 * the page owns the URL the table reads.
 */
@Component({
  selector: 'app-summary-panel',
  imports: [AccessChip, EmptyState, ErrorState, Skeleton],
  templateUrl: './summary-panel.html',
  styleUrl: './summary-panel.scss',
  host: { class: 'panel', '[attr.aria-busy]': "state().status === 'loading'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryPanel {
  readonly state = input.required<LoadState<RecordSummary>>();
  readonly activeStatus = input<RequestStatus | undefined>(undefined);
  readonly activePriority = input<Priority | undefined>(undefined);
  readonly retry = output();
  readonly pick = output<SummaryFilter>();

  protected readonly summary = computed(() => dataOf(this.state()));
  protected readonly failure = computed(() => failureOf(this.state()));
  protected readonly totalText = computed(() => plural(this.summary()?.total ?? 0, 'request'));

  protected readonly statuses = computed(() => {
    const summary = this.summary();
    if (!summary) return [];
    return STATUS_ORDER.map((status) => {
      const count = summary.byStatus[status];
      return {
        status,
        count,
        ...statusDisplay(status),
        share: summary.total === 0 ? 0 : (count / summary.total) * 100,
      };
    });
  });

  protected readonly barLabel = computed(() =>
    this.statuses()
      .map((segment) => `${segment.label} ${String(segment.count)}`)
      .join(', '),
  );

  protected readonly accessSplit = computed(() => {
    const summary = this.summary();
    if (summary?.scope !== 'ALL') return [];
    return ACCESS_LEVELS.map((level) => ({
      level,
      count: summary.byAccessLevel[level] ?? 0,
      ...accessDisplay(level),
    }));
  });

  protected pickStatus(status: RequestStatus): void {
    this.pick.emit({ status: this.activeStatus() === status ? undefined : status });
  }

  protected pickCritical(): void {
    const isActive = this.activePriority() === 'CRITICAL';
    this.pick.emit({ priority: isActive ? undefined : 'CRITICAL' });
  }
}
