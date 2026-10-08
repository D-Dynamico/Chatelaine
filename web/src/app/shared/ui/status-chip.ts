import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** A neutral pill: an icon per status and the word, never color (§21, §24). */
@Component({
  selector: 'app-status-chip',
  imports: [MatIconModule],
  template: `
    <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
    <span>{{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0 var(--space-2) 0 var(--space-1);
      border: 1px solid var(--line);
      border-radius: var(--radius-tag);
      color: var(--ink);
      font: var(--type-small);
      white-space: nowrap;
    }

    mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--ink-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
}
