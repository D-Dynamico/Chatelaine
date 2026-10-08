import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { type AccessTone } from './role-badge';

/**
 * A request's access level (§24): the role badge's key tag, smaller. Admin-level adds a
 * lock with the word, so the restriction never rests on color.
 */
@Component({
  selector: 'app-access-chip',
  imports: [MatIconModule],
  template: `
    <span class="hole" aria-hidden="true"></span>
    @if (tone() === 'admin') {
      <mat-icon class="lock" aria-hidden="true">lock</mat-icon>
    }
    {{ label() }}
  `,
  styleUrl: './access-chip.scss',
  host: { '[class.admin]': "tone() === 'admin'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessChip {
  readonly tone = input.required<AccessTone>();
  readonly label = input.required<string>();
}
