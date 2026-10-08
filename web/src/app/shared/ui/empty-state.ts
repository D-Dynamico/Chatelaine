import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/** A short sentence and, when there is something to do about it, one action (§24). */
@Component({
  selector: 'app-empty-state',
  imports: [MatButtonModule],
  template: `
    <p class="message">{{ message() }}</p>
    @if (actionLabel(); as label) {
      <button mat-stroked-button type="button" (click)="action.emit()">{{ label }}</button>
    }
  `,
  styles: `
    :host {
      display: grid;
      justify-items: start;
      gap: var(--space-3);
      padding: var(--space-5) 0;
    }

    .message {
      margin: 0;
      color: var(--ink-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly action = output();
}
