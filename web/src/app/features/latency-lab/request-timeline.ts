import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { type RequestLogEntry } from '../../core/latency/request-log-store';
import { layoutTimeline } from './timeline-geometry';

export const TIMELINE_EMPTY_MESSAGE = 'No requests yet. Load a page to see its calls here.';

/**
 * The request timeline (§19): one row per request, newest at the bottom, each bar split
 * into simulated delay, server work and the network remainder. Presentational: the lab
 * panel gives it the log and the clock. The outcome is said in words on every row and
 * shown by the bar's treatment, never by color alone (§21).
 *
 * Rows are one tab stop and move with the arrow keys, Home and End, so a long log does not
 * cost forty tab presses; the focused row shows its full description.
 */
@Component({
  selector: 'app-request-timeline',
  imports: [MatButtonModule],
  templateUrl: './request-timeline.html',
  styleUrl: './request-timeline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestTimeline {
  readonly entries = input.required<readonly RequestLogEntry[]>();
  /** The clock that grows pending bars, or null when it is off (reduced motion). */
  readonly now = input.required<number | null>();
  readonly clear = output();

  protected readonly timeline = computed(() => layoutTimeline(this.entries(), this.now()));
  protected readonly emptyMessage = TIMELINE_EMPTY_MESSAGE;

  private readonly rowElements = viewChildren<ElementRef<HTMLElement>>('rowItem');
  private readonly listElement = viewChild<ElementRef<HTMLElement>>('list');
  private readonly requestedIndex = signal(0);
  /** The row that is the tab stop: the last one asked for, kept inside the log. */
  protected readonly activeIndex = computed(() =>
    Math.min(this.requestedIndex(), Math.max(this.timeline().rows.length - 1, 0)),
  );

  constructor() {
    // New requests arrive at the bottom; keep them in view as the log grows.
    effect(() => {
      const count = this.timeline().rows.length;
      const list = this.listElement()?.nativeElement;
      if (list && count > 0) list.scrollTop = list.scrollHeight;
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const last = this.timeline().rows.length - 1;
    const current = this.activeIndex();
    const target = {
      ArrowDown: Math.min(current + 1, last),
      ArrowUp: Math.max(current - 1, 0),
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.requestedIndex.set(target);
    this.rowElements()[target]?.nativeElement.focus();
  }

  protected onFocus(index: number): void {
    this.requestedIndex.set(index);
  }
}
