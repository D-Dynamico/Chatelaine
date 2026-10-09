import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { type UserView } from '../../core/models/user';
import { RIYA, TEST_API_BASE, errorBody } from '../../testing/fixtures';
import { provideTestHttp } from '../../testing/http-testing';
import { AdminUsersService } from './admin-users.service';
import { DELETE_MESSAGES, DeleteUserDialog, impactSentence } from './delete-user-dialog';

const USERS = `${TEST_API_BASE}/admin/users`;
const KABIR: UserView = {
  ...RIYA,
  userId: 'kabir',
  displayName: 'Kabir Mehta',
  status: 'DISABLED',
};
const conflict = (code: string, message: string) =>
  [errorBody(code, message), { status: 409, statusText: 'Conflict' }] as const;

async function openDialog(user: UserView = RIYA) {
  const dialogRef = { close: vi.fn(), disableClose: false };
  TestBed.configureTestingModule({
    providers: [
      ...provideTestHttp(),
      provideRouter([]),
      AdminUsersService,
      { provide: MAT_DIALOG_DATA, useValue: user },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  const fixture = TestBed.createComponent(DeleteUserDialog);
  const host = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  await settle();
  const buttonNamed = (name: string): HTMLButtonElement | null =>
    [...host.querySelectorAll('button')].find((button) => button.textContent.includes(name)) ??
    null;
  const text = () => host.textContent.replace(/\s+/g, ' ');
  const userRequest = () => http.expectOne(`${USERS}/${user.userId}`);
  return { host, http, dialogRef, settle, buttonNamed, text, userRequest };
}

describe('impactSentence', () => {
  it.each([
    [0, 'They have no service requests.'],
    [1, 'Their 1 service request will be deleted too.'],
    [7, 'Their 7 service requests will be deleted too.'],
  ])('words %i requests', (count, sentence) => {
    expect(impactSentence(count)).toBe(sentence);
  });
});

describe('DeleteUserDialog', () => {
  it('fetches the user first and states the impact before anything can be deleted', async () => {
    const dialog = await openDialog();
    expect(dialog.buttonNamed('Delete user')?.disabled).toBe(true);
    expect(dialog.host.querySelector('app-skeleton')).not.toBeNull();

    const request = dialog.userRequest();
    expect(request.request.method).toBe('GET');
    request.flush({ ...RIYA, recordCount: 7 });
    await dialog.settle();

    expect(dialog.text()).toContain('Delete Riya Sharma?');
    expect(dialog.text()).toContain(
      "Their 7 service requests will be deleted too. This can't be undone.",
    );
    expect(dialog.buttonNamed('Delete user')?.disabled).toBe(false);
  });

  it('shows a failed lookup with its code and recovers on "Try again"', async () => {
    const dialog = await openDialog();
    dialog
      .userRequest()
      .flush(errorBody('SIMULATED_FAILURE'), { status: 503, statusText: 'Unavailable' });
    await dialog.settle();

    expect(dialog.text()).toContain(DELETE_MESSAGES.failedToLoad);
    expect(dialog.text()).toContain('503 SIMULATED_FAILURE');
    expect(dialog.buttonNamed('Delete user')?.disabled).toBe(true);

    dialog.buttonNamed('Try again')?.click();
    dialog.userRequest().flush({ ...RIYA, recordCount: 0 });
    await dialog.settle();

    expect(dialog.text()).toContain('They have no service requests.');
  });

  it('deletes with DELETE and closes as deleted', async () => {
    const dialog = await openDialog();
    dialog.userRequest().flush({ ...RIYA, recordCount: 7 });
    await dialog.settle();

    dialog.buttonNamed('Delete user')?.click();
    await dialog.settle();
    const request = dialog.http.expectOne(`${USERS}/riya`);
    expect(request.request.method).toBe('DELETE');
    expect(dialog.dialogRef.disableClose).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await dialog.settle();

    expect(dialog.dialogRef.close).toHaveBeenCalledWith('deleted');
  });

  it('"Disable instead" sends a PATCH, never a DELETE, with no second question', async () => {
    const dialog = await openDialog();
    dialog.userRequest().flush({ ...RIYA, recordCount: 7 });
    await dialog.settle();

    dialog.buttonNamed('Disable instead')?.click();
    await dialog.settle();
    const request = dialog.http.expectOne(`${USERS}/riya`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'DISABLED' });
    request.flush({ ...RIYA, status: 'DISABLED' });
    await dialog.settle();

    expect(dialog.dialogRef.close).toHaveBeenCalledWith('disabled');
  });

  it('does not offer "Disable instead" for a user who is already disabled', async () => {
    const dialog = await openDialog(KABIR);
    dialog.userRequest().flush({ ...KABIR, recordCount: 2 });
    await dialog.settle();

    expect(dialog.buttonNamed('Disable instead')).toBeNull();
    expect(dialog.buttonNamed('Delete user')).not.toBeNull();
  });

  it("keeps a refusal in the dialog in the API's words, and stays open", async () => {
    const dialog = await openDialog();
    dialog.userRequest().flush({ ...RIYA, recordCount: 7 });
    await dialog.settle();

    dialog.buttonNamed('Delete user')?.click();
    await dialog.settle();
    dialog.http
      .expectOne(`${USERS}/riya`)
      .flush(...conflict('LAST_ADMIN', 'At least one active admin must remain.'));
    await dialog.settle();

    expect(dialog.host.querySelector('[role="alert"]')?.textContent).toContain(
      'At least one active admin must remain.',
    );
    expect(dialog.dialogRef.close).not.toHaveBeenCalled();
    expect(dialog.dialogRef.disableClose).toBe(false);
    expect(dialog.buttonNamed('Delete user')?.disabled).toBe(false);
  });
});
