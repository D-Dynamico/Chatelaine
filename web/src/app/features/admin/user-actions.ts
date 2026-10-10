import { DestroyRef, Injectable, Injector, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError } from '../../core/http/api-error';
import { type UserView } from '../../core/models/user';
import { ConfirmDialog, type ConfirmDialogData } from '../../shared/ui/confirm-dialog';
import { AdminUsersService } from './admin-users.service';
import { type DeleteOutcome, DeleteUserDialog } from './delete-user-dialog';
import { type UserFormData } from './user-form';
import { UserFormDialog } from './user-form-dialog';

/** The snackbar after each change (§25). */
export const USER_CONFIRMATIONS = {
  created: 'User created',
  saved: 'Changes saved',
  disabled: 'User disabled',
  enabled: 'User enabled',
  deleted: 'User deleted',
} as const;

const UNEXPECTED_FAILURE = "The change wasn't saved. Try again.";
const CONFIRMATION_MS = 4_000;
const REFUSAL_MS = 8_000;
/** Wide enough for the form, never wider than a 360px screen allows. */
const DIALOG_SIZE = { width: '32rem', maxWidth: 'calc(100vw - 2rem)' } as const;

/**
 * Everything an admin can do to a user from the users page: the dialogs, and what follows a
 * change (§20, §25). Provided on the page, not in root, so the dialogs it opens get the page's
 * injector: `MatDialog` lives in root, which cannot see the route-provided
 * `AdminUsersService`. Every change is pessimistic (D24): nothing on screen changes until the
 * server has agreed, then the table reloads in place and a snackbar confirms it.
 */
@Injectable()
export class UserActions {
  private readonly admin = inject(AdminUsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  create(): void {
    this.openForm({ mode: 'create' }, USER_CONFIRMATIONS.created);
  }

  edit(user: UserView, isSelf: boolean): void {
    this.openForm({ mode: 'edit', user, isSelf }, USER_CONFIRMATIONS.saved);
  }

  disable(user: UserView): void {
    const data: ConfirmDialogData = {
      title: `Disable ${user.displayName}?`,
      message: "They'll lose access on their next action. You can enable them again later.",
      confirmLabel: 'Disable user',
    };
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, { ...DIALOG_SIZE, data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isConfirmed) => {
        if (isConfirmed) this.setStatus(user, 'DISABLED', USER_CONFIRMATIONS.disabled);
      });
  }

  /** Enabling only gives access back, so it asks nothing. */
  enable(user: UserView): void {
    this.setStatus(user, 'ACTIVE', USER_CONFIRMATIONS.enabled);
  }

  delete(user: UserView): void {
    this.dialog
      .open<DeleteUserDialog, UserView, DeleteOutcome>(DeleteUserDialog, {
        ...DIALOG_SIZE,
        data: user,
        injector: this.injector,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((outcome) => {
        if (outcome === 'deleted') this.confirm(USER_CONFIRMATIONS.deleted);
        if (outcome === 'disabled') this.confirm(USER_CONFIRMATIONS.disabled);
      });
  }

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

  /**
   * A refusal (such as `LAST_ADMIN`) has no dialog to show it in, so it is said in a
   * snackbar in the API's own words.
   */
  private setStatus(user: UserView, status: UserView['status'], confirmation: string): void {
    this.admin
      .update(user.userId, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirm(confirmation);
        },
        error: (error: unknown) => {
          const message = error instanceof ApiError ? error.message : UNEXPECTED_FAILURE;
          this.snackBar.open(message, undefined, { duration: REFUSAL_MS });
        },
      });
  }

  private confirm(message: string): void {
    this.admin.reload();
    this.snackBar.open(message, undefined, { duration: CONFIRMATION_MS });
  }
}
