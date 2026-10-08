import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Verdigris means General access, brass means Admin access, and nothing else (§21). */
export type AccessTone = 'general' | 'admin';

/**
 * A key tag: a pill with a punched hole, colored by access (§24). The text is always
 * there, so the color is never the only signal.
 */
@Component({
  selector: 'app-role-badge',
  template: `<span class="hole" aria-hidden="true"></span>{{ label() }}`,
  styleUrl: './role-badge.scss',
  host: { '[class.admin]': "tone() === 'admin'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleBadge {
  readonly tone = input.required<AccessTone>();
  readonly label = input.required<string>();
}
