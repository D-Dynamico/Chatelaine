import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { type LoadFailure } from '../load-state/load-state';

/**
 * What failed, in the interface's voice, and "Try again" (§24). The failure's own message
 * and code follow in small text, so a simulated failure shows `SIMULATED_FAILURE` exactly
 * as a real one shows its code.
 */
@Component({
  selector: 'app-error-state',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="text">
      <p class="message">{{ message() }}</p>
      <p class="detail">
        {{ failure().message }}
        <span class="code tabular">{{ code() }}</span>
      </p>
    </div>
    <button mat-stroked-button type="button" (click)="retry.emit()">
      <mat-icon>refresh</mat-icon>
      Try again
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-control);
      background: var(--signal-tint);
    }

    .text {
      display: grid;
      gap: var(--space-1);
    }

    p {
      margin: 0;
    }

    .message {
      color: var(--signal);
      font-weight: 600;
    }

    .detail {
      color: var(--ink);
      font: var(--type-small);
    }

    .code {
      margin-left: var(--space-2);
      color: var(--signal);
    }
  `,
  host: { role: 'alert' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  /** What failed, for example "Couldn't load the summary." */
  readonly message = input.required<string>();
  readonly failure = input.required<LoadFailure>();
  readonly retry = output();

  protected readonly code = computed(() => {
    const { status, code } = this.failure();
    return status > 0 ? `${String(status)} ${code}` : code;
  });
}
