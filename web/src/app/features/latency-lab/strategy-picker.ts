import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { LOADING_STRATEGIES, type LoadingStrategy } from '../../core/latency/latency-settings';

/** What each strategy does to the dashboard, in a line (§19). */
export const STRATEGY_OPTIONS: Readonly<
  Record<LoadingStrategy, { label: string; description: string }>
> = {
  independent: {
    label: 'Independent',
    description: 'Each panel appears as soon as its own data arrives.',
  },
  'all-at-once': {
    label: 'All at once',
    description:
      'Nothing appears until the slowest call finishes, and one failure fails all three.',
  },
  sequential: {
    label: 'One after another',
    description: 'Profile, then summary, then records, each waiting for the one before.',
  },
};

/** The loading strategy as a radio group. Presentational: it reports the choice. */
@Component({
  selector: 'app-strategy-picker',
  imports: [MatRadioModule],
  template: `
    <mat-radio-group
      class="options"
      aria-label="Loading strategy"
      [value]="strategy()"
      (change)="choose.emit($event.value)"
    >
      @for (option of options; track option.value) {
        <mat-radio-button [value]="option.value">
          <span class="label">{{ option.label }}</span>
          <span class="description">{{ option.description }}</span>
        </mat-radio-button>
      }
    </mat-radio-group>
  `,
  styles: `
    .options {
      display: grid;
      gap: var(--space-2);
    }

    .label {
      display: block;
      font-weight: 600;
    }

    .description {
      display: block;
      color: var(--ink-muted);
      font: var(--type-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategyPicker {
  readonly strategy = input.required<LoadingStrategy>();
  readonly choose = output<LoadingStrategy>();

  protected readonly options = LOADING_STRATEGIES.map((value) => ({
    value,
    ...STRATEGY_OPTIONS[value],
  }));
}
