import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ROLE_LABELS, type UserView } from '../core/models/user';
import { RoleBadge } from '../shared/ui/role-badge';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** The avatar button and its menu: who is signed in, in which role, and "Sign out" (§23). */
@Component({
  selector: 'app-account-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, RoleBadge],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  readonly user = input.required<UserView>();
  readonly signOut = output();

  protected readonly initials = computed(() => initialsOf(this.user().displayName));
  protected readonly roleLabel = computed(() => ROLE_LABELS[this.user().role]);
  protected readonly tone = computed(() => (this.user().role === 'ADMIN' ? 'admin' : 'general'));
}
