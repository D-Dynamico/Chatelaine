import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function describeSince(at: Date, now: Date): string {
  const seconds = Math.round((at.getTime() - now.getTime()) / 1000);
  const unit = UNITS.find(([, size]) => Math.abs(seconds) >= size);
  if (!unit) return 'just now';
  const [name, size] = unit;
  return RELATIVE.format(Math.round(seconds / size), name);
}

/** A relative time, with the exact time on hover and in the `datetime` attribute (§20). */
@Component({
  selector: 'app-relative-time',
  imports: [DatePipe],
  template: `<time [attr.datetime]="at()" [title]="at() | date: 'medium'">{{ text() }}</time>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelativeTime {
  /** An ISO 8601 timestamp. */
  readonly at = input.required<string>();
  /** The reference point; tests pass a fixed one. */
  readonly now = input<Date>(new Date());

  protected readonly text = computed(() => describeSince(new Date(this.at()), this.now()));
}
