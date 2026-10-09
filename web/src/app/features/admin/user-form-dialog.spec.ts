import { HttpTestingController, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { SessionStore } from '../../core/auth/session-store';
import { MEERA, RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { AdminUsersService } from './admin-users.service';
import { SELF_ACTION_REASONS } from './user-display';
import { type UserFormData } from './user-form';
import { USER_ID_HINTS, UserFormDialog } from './user-form-dialog';
import { AVAILABILITY_DEBOUNCE_MS } from './user-id-availability';

const USERS = `${TEST_API_BASE}/admin/users`;
const conflict = (code: string, message: string) =>
  [errorBody(code, message), { status: 409, statusText: 'Conflict' }] as const;
const NEHA = {
  userId: 'neha',
  displayName: 'Neha Iyer',
  email: 'neha@chatelaine.test',
  department: 'Design',
  password: 'Welcome2026',
};

async function openDialog(data: UserFormData) {
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
async function fillNewUser(dialog: Awaited<ReturnType<typeof openDialog>>) {
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

describe('UserFormDialog', () => {
  beforeEach(() => {
    // The availability debounce runs on rxjs timers (setInterval) and measures with Date.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  describe('userId availability', () => {
    it('asks once, 400 ms after typing stops, and reads 404 as available', async () => {
      const dialog = await openDialog({ mode: 'create' });

      for (const text of ['n', 'ne', 'neh', 'neha']) {
        await dialog.type('userId', text);
        await vi.advanceTimersByTimeAsync(100);
      }
      dialog.http.expectNone((req) => req.url.startsWith(`${USERS}/`));
      expect(dialog.text()).toContain(USER_ID_HINTS.checking);

      await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
      dialog
        .lookup('neha')
        .flush(errorBody('USER_NOT_FOUND'), { status: 404, statusText: 'Not Found' });
      await dialog.settle();

      expect(dialog.text()).toContain(USER_ID_HINTS.available);
    });

    it('cancels a check still in flight when the userId changes', async () => {
      const dialog = await openDialog({ mode: 'create' });
      await dialog.type('userId', 'neha');
      await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
      const first = dialog.lookup('neha');

      await dialog.type('userId', 'neha.i');

      expect(first.cancelled).toBe(true);
    });

    it('reads a found user (200) as "Already taken", and blocks submit', async () => {
      const dialog = await openDialog({ mode: 'create' });
      await dialog.type('userId', 'riya');
      await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);

      dialog.lookup('riya').flush({ ...RIYA, recordCount: 17 });
      await dialog.settle();

      expect(dialog.text()).toContain('Already taken');
      expect(dialog.text()).not.toContain(USER_ID_HINTS.available);
      expect(dialog.submitButton().disabled).toBe(true);
    });

    it('says it could not check after a 503, without blocking submit', async () => {
      const dialog = await openDialog({ mode: 'create' });
      await fillNewUser(dialog);
      await dialog.type('userId', 'neha.i');
      await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);

      dialog
        .lookup('neha.i')
        .flush(errorBody('SIMULATED_FAILURE'), { status: 503, statusText: 'Unavailable' });
      await dialog.settle();

      expect(dialog.text()).toContain(USER_ID_HINTS.unchecked);
      expect(dialog.text()).not.toContain('Already taken');
      expect(dialog.submitButton().disabled).toBe(false);
    });

    it('says it could not check after a client timeout, without blocking submit', async () => {
      const dialog = await openDialog({ mode: 'create' });
      await fillNewUser(dialog);
      await dialog.type('userId', 'neha.i');
      await vi.advanceTimersByTimeAsync(AVAILABILITY_DEBOUNCE_MS);
      dialog.lookup('neha.i');

      await vi.advanceTimersByTimeAsync(60_000);
      await dialog.settle();

      expect(dialog.text()).toContain(USER_ID_HINTS.unchecked);
      expect(dialog.submitButton().disabled).toBe(false);
    });
  });

  describe('create', () => {
    it('sends the trimmed new user and closes with the saved one', async () => {
      const dialog = await openDialog({ mode: 'create' });
      await fillNewUser(dialog);

      await dialog.submit();
      const request = dialog.http.expectOne(USERS);
      expect(request.request.body).toEqual({ ...NEHA, role: 'GENERAL' });
      expect(dialog.dialogRef.disableClose).toBe(true);
      expect(dialog.submitButton().disabled).toBe(true);
      request.flush({ ...MEERA, ...NEHA, role: 'GENERAL' });
      await dialog.settle();

      expect(dialog.dialogRef.close).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'neha' }),
      );
    });

    it('marks the userId "Already taken" when the server answers 409 USER_EXISTS', async () => {
      const dialog = await openDialog({ mode: 'create' });
      await fillNewUser(dialog);

      await dialog.submit();
      dialog.http
        .expectOne(USERS)
        .flush(...conflict('USER_EXISTS', 'That user ID is already taken. Choose another one.'));
      await dialog.settle();

      expect(dialog.host.querySelector('mat-error')?.textContent.trim()).toBe('Already taken');
      expect(dialog.dialogRef.close).not.toHaveBeenCalled();
      expect(dialog.dialogRef.disableClose).toBe(false);
      expect(dialog.submitButton().disabled).toBe(true);
    });
  });

  describe('edit', () => {
    it('has no userId field, and sends only what changed', async () => {
      const dialog = await openDialog({ mode: 'edit', user: RIYA, isSelf: false });
      expect(dialog.host.querySelector('input[formcontrolname="userId"]')).toBeNull();
      expect(dialog.submitButton().disabled).toBe(true);

      await dialog.type('department', 'Accounts');
      await dialog.submit();

      const request = dialog.http.expectOne(`${USERS}/riya`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ department: 'Accounts' });
    });

    it('sends a password only when "Set a new password" is on', async () => {
      const dialog = await openDialog({ mode: 'edit', user: RIYA, isSelf: false });
      expect(dialog.host.querySelector('input[type="password"]')).toBeNull();

      dialog.host.querySelector<HTMLButtonElement>('mat-slide-toggle button')?.click();
      await dialog.settle();
      await dialog.type('password', 'Fresh2026');
      await dialog.submit();

      expect(dialog.http.expectOne(`${USERS}/riya`).request.body).toEqual({
        password: 'Fresh2026',
      });
    });

    it('locks your own role and status, and says why', async () => {
      const dialog = await openDialog({ mode: 'edit', user: MEERA, isSelf: true });
      const toggles = [
        ...dialog.host.querySelectorAll<HTMLButtonElement>('mat-button-toggle button'),
      ];

      expect(toggles.length).toBeGreaterThan(0);
      expect(toggles.every((toggle) => toggle.disabled)).toBe(true);
      expect(dialog.text()).toContain(SELF_ACTION_REASONS.role);
      expect(dialog.text()).toContain(SELF_ACTION_REASONS.status);
    });

    it('shows a 409 SELF_ACTION inside the dialog and stays open', async () => {
      const dialog = await openDialog({ mode: 'edit', user: MEERA, isSelf: true });
      await dialog.type('displayName', 'Meera N.');

      await dialog.submit();
      dialog.http
        .expectOne(`${USERS}/meera.admin`)
        .flush(
          ...conflict(
            'SELF_ACTION',
            "You can't change your own role or status. Ask another admin.",
          ),
        );
      await dialog.settle();

      const alert = dialog.host.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain("You can't change your own role or status.");
      expect(dialog.dialogRef.close).not.toHaveBeenCalled();
      expect(dialog.submitButton().disabled).toBe(false);
    });
  });
});
