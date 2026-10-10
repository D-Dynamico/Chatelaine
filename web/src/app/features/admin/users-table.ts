import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatSortModule, type Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { type SortOrder } from '../../core/models/paging';
import { USER_SORT_FIELDS, type UserSortField, type UserView } from '../../core/models/user';
import { RelativeTime } from '../../shared/ui/relative-time';
import { RoleBadge } from '../../shared/ui/role-badge';
import { StatusChip } from '../../shared/ui/status-chip';
import { type UsersPage } from './admin-users.service';
import { SELF_ACTION_REASONS, roleDisplay, userStatusDisplay } from './user-display';
import { UserRowTyping } from './user-row-typing';
import { DEFAULT_USER_SORT } from './users-query';

export const USER_COLUMNS = ['user', 'role', 'status', 'department', 'lastLoginAt', 'actions'];

export interface UserTableSort {
  readonly field: UserSortField;
  readonly order: SortOrder;
}

/**
 * Users as a table (§20, §23). Presentational: the page owns the query, the data and the
 * dialogs, and this emits what the admin asked for. The signed-in admin's own row offers
 * Disable and Delete only as disabled items that say why, because the API refuses both
 * with `SELF_ACTION` (§12).
 */
@Component({
  selector: 'app-users-table',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    RelativeTime,
    RoleBadge,
    StatusChip,
    UserRowTyping,
  ],
  templateUrl: './users-table.html',
  styleUrl: './users-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTable {
  readonly page = input.required<UsersPage>();
  readonly sort = input.required<UserTableSort>();
  /** The signed-in admin, whose own row is protected. */
  readonly currentUserId = input.required<string>();
  /** The current time, from the container's clock, for relative times. */
  readonly now = input.required<Date>();
  readonly sortChange = output<UserTableSort | null>();
  readonly pageChange = output<number>();
  readonly edit = output<UserView>();
  readonly disable = output<UserView>();
  readonly enable = output<UserView>();
  readonly remove = output<UserView>();

  protected readonly columns = USER_COLUMNS;
  protected readonly rows = computed(() => this.page().items);
  protected readonly role = roleDisplay;
  protected readonly status = userStatusDisplay;
  protected readonly reasons = SELF_ACTION_REASONS;

  /** The default order (by user ID) has no column, so no header shows it as active. */
  protected readonly activeSort = computed(() => {
    const { field } = this.sort();
    return field === DEFAULT_USER_SORT.sort ? '' : field;
  });

  protected isSelf(user: UserView): boolean {
    return user.userId === this.currentUserId();
  }

  /**
   * `disabledInteractive` keeps a disabled item focusable so its tooltip can say why, but
   * it still delivers the click, so the own row is refused here as well.
   */
  protected requestDisable(user: UserView): void {
    if (!this.isSelf(user)) this.disable.emit(user);
  }

  protected requestRemove(user: UserView): void {
    if (!this.isSelf(user)) this.remove.emit(user);
  }

  /** A cleared sort (third click) goes back to the default order. */
  protected onSort(event: Sort): void {
    const field = USER_SORT_FIELDS.find((known) => known === event.active);
    if (event.direction === '' || field === undefined) {
      this.sortChange.emit(null);
      return;
    }
    this.sortChange.emit({ field, order: event.direction });
  }

  protected onPage(event: PageEvent): void {
    this.pageChange.emit(event.pageIndex + 1);
  }
}
