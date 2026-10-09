import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { type AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { type ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiError } from '../../core/http/api-error';
import {
  ROLES,
  ROLE_LABELS,
  USER_STATUSES,
  USER_RULES,
  USER_STATUS_LABELS,
  type UserView,
} from '../../core/models/user';
import { AdminUsersService } from './admin-users.service';
import { SELF_ACTION_REASONS } from './user-display';
import {
  type UserFormData,
  buildUserForm,
  errorMessageFor,
  prepareUserForm,
  toNewUser,
  toUserChanges,
} from './user-form';
import { UserIdAvailability } from './user-id-availability';

export const USER_ID_HINTS = {
  checking: 'Checking',
  available: 'Available',
  unchecked: "Couldn't check availability",
} as const;

const UNEXPECTED_FAILURE = "The change wasn't saved. Try again.";

/** Shows a field's error as soon as it is typed in, not only after it loses focus. */
const whileTyping: ErrorStateMatcher = {
  isErrorState: (control: AbstractControl | null) =>
    control !== null && control.invalid && (control.dirty || control.touched),
};

/**
 * Create and edit a user (§20): one component, two modes. Saving is pessimistic (D24):
 * the dialog shows progress, cannot be dismissed meanwhile, and closes with the server's
 * answer only on success. A refusal stays in the dialog, beside the field it concerns
 * where there is one.
 */
@Component({
  selector: 'app-user-form-dialog',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialog {
  private readonly admin = inject(AdminUsersService);
  private readonly dialogRef = inject<MatDialogRef<UserFormDialog, UserView>>(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<UserFormData>(MAT_DIALOG_DATA);
  private readonly availability = new UserIdAvailability((userId) =>
    this.admin.isUserIdTaken(userId),
  );

  protected readonly form = buildUserForm();
  protected readonly editing = this.data.mode === 'edit' ? this.data : null;
  protected readonly title = this.editing ? `Edit ${this.editing.user.displayName}` : 'Create user';
  protected readonly submitLabel = this.editing ? 'Save changes' : 'Create user';
  protected readonly isSaving = signal(false);
  protected readonly isSettingPassword = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly whileTyping = whileTyping;
  protected readonly passwordHint = `At least ${String(USER_RULES.passwordMin)} characters, with a letter and a digit`;
  protected readonly reasons = SELF_ACTION_REASONS;
  protected readonly roles = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
  protected readonly statuses = USER_STATUSES.map((status) => ({
    value: status,
    label: USER_STATUS_LABELS[status],
  }));

  /** Ticks on every change of value or status, including an async check finishing. */
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  protected readonly errors = computed(() => {
    this.formEvents();
    const { controls } = this.form;
    return {
      userId: errorMessageFor('userId', controls.userId),
      displayName: errorMessageFor('displayName', controls.displayName),
      email: errorMessageFor('email', controls.email),
      department: errorMessageFor('department', controls.department),
      password: errorMessageFor('password', controls.password),
    };
  });

  /** "Checking", "Available" or "Couldn't check availability"; "Already taken" is an error. */
  protected readonly userIdHint = computed(() => {
    this.formEvents();
    const control = this.form.controls.userId;
    if (control.pending) return USER_ID_HINTS.checking;
    if (control.invalid) return null;
    const result = this.availability.resultFor(control.value);
    return result === 'available' || result === 'unchecked' ? USER_ID_HINTS[result] : null;
  });

  protected readonly canSubmit = computed(() => {
    this.formEvents();
    if (this.isSaving() || this.form.invalid || this.form.pending) return false;
    return this.editing ? Object.keys(this.changes()).length > 0 : true;
  });

  constructor() {
    prepareUserForm(this.form, this.data);
    if (!this.editing) this.form.controls.userId.addAsyncValidators(this.availability.validator);
  }

  protected setPasswordToggle(isOn: boolean): void {
    this.isSettingPassword.set(isOn);
    const { password } = this.form.controls;
    password.reset('');
    if (isOn) password.enable();
    else password.disable();
  }

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.isSaving.set(true);
    this.failure.set(null);
    this.dialogRef.disableClose = true;
    const save$ = this.editing
      ? this.admin.update(this.editing.user.userId, this.changes())
      : this.admin.create(toNewUser(this.form));
    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.dialogRef.close(saved);
      },
      error: (error: unknown) => {
        this.showRefusal(error);
      },
    });
  }

  private changes() {
    return this.editing ? toUserChanges(this.form, this.editing.user) : {};
  }

  /** `USER_EXISTS` belongs to the userId field; anything else is said above the form. */
  private showRefusal(error: unknown): void {
    this.isSaving.set(false);
    this.dialogRef.disableClose = false;
    if (error instanceof ApiError && error.code === 'USER_EXISTS') {
      const { userId } = this.form.controls;
      userId.setErrors({ ...userId.errors, userIdTaken: true });
      userId.markAsTouched();
      return;
    }
    this.failure.set(error instanceof ApiError ? error.message : UNEXPECTED_FAILURE);
  }
}
