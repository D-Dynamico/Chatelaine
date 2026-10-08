import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const LEVELS = [1, 2, 3, 4] as const;

/** One to four short bars in ink, plus the word (§24). The word carries the meaning. */
@Component({
  selector: 'app-priority-mark',
  template: `
    <span class="bars" aria-hidden="true">
      @for (bar of bars(); track bar.level) {
        <span class="bar" [class.filled]="bar.isFilled"></span>
      }
    </span>
    {{ label() }}
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      white-space: nowrap;
    }

    .bars {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
      height: 12px;
    }

    .bar {
      width: 3px;
      border-radius: 1px;
      background: var(--line);

      &:nth-child(1) {
        height: 5px;
      }
      &:nth-child(2) {
        height: 7px;
      }
      &:nth-child(3) {
        height: 10px;
      }
      &:nth-child(4) {
        height: 12px;
      }
    }

    .filled {
      background: var(--ink);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityMark {
  /** 1 (lowest) to 4 (most severe). */
  readonly level = input.required<number>();
  readonly label = input.required<string>();

  protected readonly bars = computed(() =>
    LEVELS.map((level) => ({ level, isFilled: level <= this.level() })),
  );
}
