import { HttpTestingController, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { SessionStore } from '../core/auth/session-store';
import { MEERA, TEST_API_BASE, errorBody } from './fixtures';
import { provideTestHttp } from './http-testing';
import { AdminUsersService } from '../features/admin/admin-users.service';
import { type UserFormData } from '../features/admin/user-form';
import { UserFormDialog } from '../features/admin/user-form-dialog';
import { AVAILABILITY_DEBOUNCE_MS } from '../features/admin/user-id-availability';

/** Opens the create and edit dialog with a real service and fake timers, for its specs (§20). */
export const USERS = `${TEST_API_BASE}/admin/users`;
export const conflict = (code: string, message: string) =>
  [errorBody(code, message), { status: 409, statusText: 'Conflict' }] as const;
export const NEHA = {
  userId: 'neha',
  displayName: 'Neha Iyer',
  email: 'neha@chatelaine.test',
  department: 'Design',
  password: 'Welcome2026',
};

export async function openDialog(data: UserFormData) {
  const dialogRef = { close: vi.fn(), disableClose: false };
  TestBed.configureTestingModule({
    providers: [
      ...provideTestHttp(),
      provideRouter([]),
      AdminUsersService,
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  TestBed.inject(SessionStore).start('jwt', MEERA);
  const fixture = TestBed.createComponent(UserFormDialog);
  const host = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  // With timers faked, whenStable would wait on a scheduler tick that never comes, so the
  // timers are run and the view checked directly.
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
  };
  await settle();
  const field = (name: string): HTMLInputElement => {
    const input = host.querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`);
    if (!input) throw new Error(`No ${name} field`);
    return input;
  };
  const type = async (name: string, value: string) => {
    const input = field(name);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const submitButton = (): HTMLButtonElement => {
    const button = host.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!button) throw new Error('No submit button');
    return button;
  };
  const submit = async () => {
    submitButton().click();
    await settle();
  };
  const lookup = (userId: string): TestRequest => http.expectOne(`${USERS}/${userId}`);
  const text = () => host.textContent.replace(/\s+/g, ' ');
  return {
    fixture,
    host,
    http,
    dialogRef,
    settle,
    field,
    type,
    submit,
    submitButton,
    lookup,
    text,
  };
}

/** Fills the create form, with the userId check answered "available". */
export async function fillNewUser(dialog: Awaited<ReturnType<typeof openDialog>>) {
  await dialog.type('userId', NEHA.userId);
  await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
  dialog
    .lookup('neha')
    .flush(errorBody('USER_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
  await dialog.settle();
  await dialog.type('displayName', `  ${NEHA.displayName} `);
  await dialog.type('email', NEHA.email);
  await dialog.type('department', NEHA.department);
  await dialog.type('password', NEHA.password);
}
