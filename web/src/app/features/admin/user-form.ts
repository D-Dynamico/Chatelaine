import {
  type AbstractControl,
  FormControl,
  FormGroup,
  type ValidationErrors,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  type NewUser,
  type Role,
  USER_RULES,
  type UserChanges,
  type UserStatus,
  type UserView,
} from '../../core/models/user';

/** What the dialog is for: a new user, or an existing one (and whether it is your own). */
export type UserFormData =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly user: UserView; readonly isSelf: boolean };

/** Whitespace only is as empty as nothing: the API trims before it checks length. */
const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

/** The API's password policy (§12): a length range, at least one letter and one digit. */
const passwordPolicy: ValidatorFn = (control): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value : '';
  if (value === '') return null;
  const fits =
    value.length >= USER_RULES.passwordMin &&
    value.length <= USER_RULES.passwordMax &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value);
  return fits ? null : { passwordPolicy: true };
};

const text = (validators: ValidatorFn[]) => new FormControl('', { nonNullable: true, validators });

export function buildUserForm() {
  return new FormGroup({
    userId: text([Validators.required, Validators.pattern(USER_RULES.userIdPattern)]),
    displayName: text([notBlank, Validators.maxLength(USER_RULES.displayNameMax)]),
    email: text([notBlank, Validators.email, Validators.maxLength(USER_RULES.emailMax)]),
    department: text([notBlank, Validators.maxLength(USER_RULES.departmentMax)]),
    role: new FormControl<Role>('GENERAL', { nonNullable: true }),
    status: new FormControl<UserStatus>('ACTIVE', { nonNullable: true }),
    password: text([Validators.required, passwordPolicy]),
  });
}

export type UserForm = ReturnType<typeof buildUserForm>;
type FieldName = keyof UserForm['controls'];

/** Each field's errors in the interface's voice (§25), most important first. */
const FIELD_MESSAGES: Readonly<Record<FieldName, readonly (readonly [string, string])[]>> = {
  userId: [
    ['required', 'Enter a user ID.'],
    ['pattern', 'Use 3 to 32 lower-case letters, digits, dots, underscores or hyphens.'],
    ['userIdTaken', 'Already taken'],
  ],
  displayName: [
    ['required', 'Enter a display name.'],
    ['maxlength', `Use at most ${String(USER_RULES.displayNameMax)} characters.`],
  ],
  email: [
    ['required', 'Enter an email address.'],
    ['email', 'Enter a valid email address, such as neha@chatelaine.test.'],
    ['maxlength', `Use at most ${String(USER_RULES.emailMax)} characters.`],
  ],
  department: [
    ['required', 'Enter a department.'],
    ['maxlength', `Use at most ${String(USER_RULES.departmentMax)} characters.`],
  ],
  role: [],
  status: [],
  password: [
    ['required', 'Enter a password.'],
    [
      'passwordPolicy',
      `Use ${String(USER_RULES.passwordMin)} to ${String(USER_RULES.passwordMax)} characters with at least one letter and one digit.`,
    ],
  ],
};

export function errorMessageFor(field: FieldName, control: AbstractControl): string | null {
  const found = FIELD_MESSAGES[field].find(([key]) => control.hasError(key));
  return found ? found[1] : null;
}

/**
 * Prepares the form for its mode. Disabled controls are neither validated nor part of the
 * form's value, which is exactly what each mode needs: no status on create, no userId on
 * edit, the password only when "Set a new password" is on, and no role or status on your
 * own row (the API refuses those with `SELF_ACTION`, §12).
 */
export function prepareUserForm(form: UserForm, data: UserFormData): void {
  if (data.mode === 'create') {
    form.controls.status.disable();
    return;
  }
  const { user, isSelf } = data;
  form.patchValue(user);
  form.controls.userId.disable();
  form.controls.password.disable();
  if (isSelf) {
    form.controls.role.disable();
    form.controls.status.disable();
  }
}

export function toNewUser(form: UserForm): NewUser {
  const value = form.getRawValue();
  return {
    userId: value.userId.trim(),
    displayName: value.displayName.trim(),
    email: value.email.trim(),
    department: value.department.trim(),
    role: value.role,
    password: value.password,
  };
}

/**
 * Only what changed, so an edit never re-sends a field the admin did not touch. Disabled
 * fields are left out by `form.value`, so your own role and status are never sent.
 */
export function toUserChanges(form: UserForm, original: UserView): UserChanges {
  const value = form.value;
  const changes: { -readonly [K in keyof UserChanges]: UserChanges[K] } = {};
  for (const key of ['displayName', 'email', 'department'] as const) {
    const next = value[key]?.trim();
    if (next !== undefined && next !== original[key]) changes[key] = next;
  }
  if (value.role !== undefined && value.role !== original.role) changes.role = value.role;
  if (value.status !== undefined && value.status !== original.status) {
    changes.status = value.status;
  }
  if (value.password) changes.password = value.password;
  return changes;
}
