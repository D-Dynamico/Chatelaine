import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { type Observable, Subject, startWith, switchMap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { type UserView } from '../../core/models/user';
import { dataOf, failureOf, toLoadState } from '../../shared/load-state/load-state';
import { ErrorState } from '../../shared/ui/error-state';
import { Skeleton } from '../../shared/ui/skeleton';
import { AdminUsersService } from './admin-users.service';

/** What the admin chose: the user is gone, or was disabled instead. */
export type DeleteOutcome = 'deleted' | 'disabled';

export const DELETE_MESSAGES = {
  failedToLoad: "Couldn't load this user's requests.",
  notSaved: "The change wasn't saved. Try again.",
} as const;

/** "Their 7 service requests will be deleted too.", worded for none and for one (§20). */
export function impactSentence(recordCount: number): string {
  if (recordCount === 0) return 'They have no service requests.';
  const noun = recordCount === 1 ? 'service request' : 'service requests';
  return `Their ${String(recordCount)} ${noun} will be deleted too.`;
}

/**
 * The delete confirmation (§20). It fetches the user first, so the impact is stated before
 * anything is deleted. "Disable instead" is offered because disabling is reversible; the
 * admin has already seen the consequences, so it does not ask again. Both are pessimistic
 * (D24): the dialog closes only after the server accepted the change, and a refusal such as
 * `LAST_ADMIN` stays in the dialog in the API's own words.
 */
@Component({
  selector: 'app-delete-user-dialog',
  imports: [ErrorState, MatButtonModule, MatDialogModule, MatProgressBarModule, Skeleton],
  templateUrl: './delete-user-dialog.html',
  styleUrl: './delete-user-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteUserDialog {
  private readonly admin = inject(AdminUsersService);
  private readonly dialogRef = inject<MatDialogRef<DeleteUserDialog, DeleteOutcome>>(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retries = new Subject<void>();

  protected readonly user = inject<UserView>(MAT_DIALOG_DATA);
  protected readonly messages = DELETE_MESSAGES;
  protected readonly isSaving = signal(false);
  protected readonly failure = signal<string | null>(null);

  protected readonly detail = toSignal(
    this.retries.pipe(
      startWith(undefined),
      switchMap(() => this.admin.user(this.user.userId).pipe(toLoadState())),
    ),
    { initialValue: { status: 'loading' } as const },
  );
  protected readonly loaded = computed(() => dataOf(this.detail()));
  protected readonly loadFailure = computed(() => failureOf(this.detail()));
  protected readonly impact = computed(() => {
    const detail = this.loaded();
    return detail ? impactSentence(detail.recordCount) : null;
  });
  protected readonly canDisableInstead = this.user.status === 'ACTIVE';

  protected retry(): void {
    this.retries.next();
  }

  protected remove(): void {
    this.run(this.admin.remove(this.user.userId), 'deleted');
  }

  protected disableInstead(): void {
    this.run(this.admin.update(this.user.userId, { status: 'DISABLED' }), 'disabled');
  }

  private run(request: Observable<unknown>, outcome: DeleteOutcome): void {
    this.isSaving.set(true);
    this.failure.set(null);
    this.dialogRef.disableClose = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.dialogRef.close(outcome);
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.dialogRef.disableClose = false;
        this.failure.set(error instanceof ApiError ? error.message : DELETE_MESSAGES.notSaved);
      },
    });
  }
}
