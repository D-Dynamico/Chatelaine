import { MEERA, RIYA } from '../../testing/fixtures';
import { SELF_ACTION_REASONS } from './user-display';
import {
  NEHA,
  USERS,
  conflict,
  fillNewUser,
  openDialog,
} from '../../testing/user-form-dialog-harness';

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
