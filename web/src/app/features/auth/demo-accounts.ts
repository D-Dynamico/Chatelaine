import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type Role } from '../../core/models/user';
import { RoleBadge } from '../../shared/ui/role-badge';

/** The seed accounts (docs/ARCHITECTURE.md §5). Demo data only; the README lists them too. */
export const DEMO_PASSWORD = 'Chatelaine@2026';

export interface DemoAccount {
  readonly userId: string;
  readonly role: Role;
  readonly roleLabel: string;
  readonly isDisabled: boolean;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { userId: 'meera.admin', role: 'ADMIN', roleLabel: 'Admin', isDisabled: false },
  { userId: 'riya', role: 'GENERAL', roleLabel: 'General', isDisabled: false },
  { userId: 'sara', role: 'GENERAL', roleLabel: 'General', isDisabled: false },
  { userId: 'kabir', role: 'GENERAL', roleLabel: 'Disabled', isDisabled: true },
];

/**
 * Key tags that fill the sign-in form (§23). Kabir's is muted and says "Disabled", so an
 * evaluator can try the refusal on purpose.
 */
@Component({
  selector: 'app-demo-accounts',
  imports: [RoleBadge],
  template: `
    <h2 class="heading" id="demo-heading">Try a demo account</h2>
    <ul class="tags" aria-labelledby="demo-heading">
      @for (account of accounts(); track account.userId) {
        <li>
          <button
            type="button"
            class="tag"
            [class.disabled-account]="account.isDisabled"
            [attr.aria-pressed]="account.userId === selectedId()"
            (click)="pick.emit(account)"
          >
            <span class="user-id">{{ account.userId }}</span>
            @if (account.isDisabled) {
              <span class="muted-label">Disabled</span>
            } @else {
              <app-role-badge
                [tone]="account.role === 'ADMIN' ? 'admin' : 'general'"
                [label]="account.roleLabel"
              />
            }
          </button>
        </li>
      }
    </ul>
    <p class="password">
      Every demo password is <span class="tabular">{{ password }}</span>
    </p>
  `,
  styleUrl: './demo-accounts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoAccounts {
  readonly accounts = input<readonly DemoAccount[]>(DEMO_ACCOUNTS);
  /** The user ID in the form, so the tag that filled it reads as chosen. */
  readonly selectedId = input('');
  readonly pick = output<DemoAccount>();

  protected readonly password = DEMO_PASSWORD;
}
