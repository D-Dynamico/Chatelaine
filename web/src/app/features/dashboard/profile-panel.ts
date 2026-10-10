import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ROLE_LABELS, type UserView } from '../../core/models/user';
import { type LoadState, dataOf, failureOf } from '../../shared/load-state/load-state';
import { ErrorState } from '../../shared/ui/error-state';
import { RelativeTime } from '../../shared/ui/relative-time';
import { RoleBadge } from '../../shared/ui/role-badge';
import { Skeleton } from '../../shared/ui/skeleton';
import { accessTone } from './record-display';

/** The one plain sentence that answers the brief's question: what can I see? (§21, §23) */
export const ACCESS_SENTENCES = {
  GENERAL:
    "You can see your own requests at General access. Requests that IT marks Admin are handled privately and don't appear here.",
  ADMIN: 'You can see every request, including Admin-level ones, internal notes and assignees.',
} as const;

/** The access card: who you are, and what your role opens. */
@Component({
  selector: 'app-profile-panel',
  imports: [ErrorState, RelativeTime, RoleBadge, Skeleton],
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.scss',
  host: {
    class: 'panel',
    '[class.admin]': 'isAdmin()',
    '[attr.aria-busy]': "state().status === 'loading'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePanel {
  readonly state = input.required<LoadState<UserView>>();
  /** The current time, from the container's clock, for relative times. */
  readonly now = input.required<Date>();
  readonly retry = output();

  protected readonly user = computed(() => dataOf(this.state()));
  protected readonly failure = computed(() => failureOf(this.state()));
  protected readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  protected readonly roleLabel = computed(() => {
    const user = this.user();
    return user ? ROLE_LABELS[user.role] : '';
  });
  protected readonly tone = computed(() => accessTone(this.user()?.role ?? 'GENERAL'));
  protected readonly sentence = computed(() =>
    this.isAdmin() ? ACCESS_SENTENCES.ADMIN : ACCESS_SENTENCES.GENERAL,
  );
}
