import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ACCESS_LEVELS, type RecordSummary } from '../../core/models/service-request';
import { type LoadState, dataOf, failureOf } from '../../shared/load-state/load-state';
import { AccessChip } from '../../shared/ui/access-chip';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { Skeleton } from '../../shared/ui/skeleton';
import { STATUS_ORDER, accessDisplay, statusDisplay } from './record-display';

function plural(count: number, noun: string): string {
  return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * One strip rather than a grid of stat cards (§21): the total, a bar split by status in
 * workflow order, the counts, and the critical ones. Admins also see the split by access
 * level; a General User's summary has no Admin-level key to show (§11).
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
  readonly retry = output();

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
}
