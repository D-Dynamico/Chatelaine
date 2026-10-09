import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  computed,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { SessionStore } from '../../core/auth/session-store';
import {
  ROLES,
  ROLE_LABELS,
  USER_STATUSES,
  USER_STATUS_LABELS,
  type UserView,
} from '../../core/models/user';
import { injectUrlQuery } from '../../core/routing/url-query';
import { dataOf, failureOf, isRefreshing } from '../../shared/load-state/load-state';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { RangeLabelIntl } from '../../shared/ui/range-label-intl';
import { Skeleton } from '../../shared/ui/skeleton';
import { AdminUsersService } from './admin-users.service';
import { type UserFormData } from './user-form';
import { UserFormDialog } from './user-form-dialog';
import {
  DEFAULT_USER_SORT,
  USERS_QUERY,
  type UsersUrlState,
  hasUserFilters,
  toUserListQuery,
} from './users-query';
import { type UserTableSort, UsersTable } from './users-table';

export const USER_SEARCH_DEBOUNCE_MS = 300;

export const USERS_MESSAGES = {
  noneMatch: 'No users match these filters.',
  failed: "Couldn't load users.",
} as const;

/** The snackbar after each change (§25). */
export const USER_CONFIRMATIONS = {
  created: 'User created',
  saved: 'Changes saved',
} as const;

const CONFIRMATION_MS = 4_000;
/** Wide enough for the form, never wider than a 360px screen allows. */
const DIALOG_SIZE = { width: '32rem', maxWidth: 'calc(100vw - 2rem)' } as const;

const options = <V extends string>(values: readonly V[], labels: Readonly<Record<V, string>>) =>
  values.map((value) => ({ value, label: labels[value] }));

/**
 * The admin users page (§20): owns the query (in the URL), the data and the dialogs, and
 * hands rows to the presentational table. Paging, sorting and reloads after a
 * change keep the rows up with a progress line; only the first load shows the skeleton.
 */
@Component({
  selector: 'app-users-page',
  imports: [
    EmptyState,
    ErrorState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    ReactiveFormsModule,
    Skeleton,
    UsersTable,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
  providers: [{ provide: MatPaginatorIntl, useClass: RangeLabelIntl }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly admin = inject(AdminUsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionStore);
  protected readonly currentUserId = computed(() => this.session.user()?.userId ?? '');
  protected readonly query = injectUrlQuery(USERS_QUERY, 'page');
  protected readonly search = new FormControl(this.query.values().q ?? '', { nonNullable: true });

  private readonly listQuery = computed(() => toUserListQuery(this.query.values()));
  protected readonly state = toSignal(this.admin.users$(toObservable(this.listQuery)), {
    initialValue: { status: 'loading' } as const,
  });

  protected readonly page = computed(() => dataOf(this.state()));
  protected readonly failure = computed(() => failureOf(this.state()));
  protected readonly isRefreshing = computed(() => isRefreshing(this.state()));
  protected readonly isFiltered = computed(() => hasUserFilters(this.query.values()));
  protected readonly sort = computed<UserTableSort>(() => ({
    field: this.query.values().sort,
    order: this.query.values().order,
  }));

  protected readonly messages = USERS_MESSAGES;
  protected readonly roleOptions = options(ROLES, ROLE_LABELS);
  protected readonly statusOptions = options(USER_STATUSES, USER_STATUS_LABELS);

  constructor() {
    this.search.valueChanges
      .pipe(
        map((text) => text.trim()),
        debounceTime(USER_SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((text) => {
        this.query.update({ q: text === '' ? undefined : text }, { isTyping: true });
      });

    // The box follows the URL when q changes from outside it (Back, or Clear filters).
    effect(() => {
      const q = this.query.values().q ?? '';
      if (this.search.value.trim() !== q) this.search.setValue(q, { emitEvent: false });
    });

    // A page past the end (an old link, or the last user on it deleted) moves to the last.
    effect(() => {
      const page = this.page();
      if (page?.items.length === 0 && page.total > 0) {
        this.query.update({ page: Math.ceil(page.total / page.pageSize) });
      }
    });
  }

  protected filter(change: Partial<UsersUrlState>): void {
    this.query.update(change);
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.query.update({ q: undefined, role: undefined, status: undefined });
  }

  protected changeSort(sort: UserTableSort | null): void {
    this.query.update(
      sort
        ? { sort: sort.field, order: sort.order }
        : { sort: DEFAULT_USER_SORT.sort, order: DEFAULT_USER_SORT.order },
    );
  }

  protected changePage(page: number): void {
    this.query.update({ page });
  }

  protected retry(): void {
    this.admin.reload();
  }

  protected openCreate(): void {
    this.openForm({ mode: 'create' }, USER_CONFIRMATIONS.created);
  }

  protected openEdit(user: UserView): void {
    const isSelf = user.userId === this.currentUserId();
    this.openForm({ mode: 'edit', user, isSelf }, USER_CONFIRMATIONS.saved);
  }

  /**
   * The dialog gets this page's injector: `MatDialog` lives in root, which cannot see the
   * route-provided `AdminUsersService`. The dialog closes only after the server accepted
   * the change (D24), so the table reloads in place and the snackbar confirms it.
   */
  private openForm(data: UserFormData, confirmation: string): void {
    this.dialog
      .open<UserFormDialog, UserFormData, UserView>(UserFormDialog, {
        ...DIALOG_SIZE,
        data,
        injector: this.injector,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) this.confirm(confirmation);
      });
  }

  private confirm(message: string): void {
    this.admin.reload();
    this.snackBar.open(message, undefined, { duration: CONFIRMATION_MS });
  }
}
