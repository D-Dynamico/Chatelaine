import { MEERA, RIYA, errorBody } from '../../testing/fixtures';
import { USER_CONFIRMATIONS } from './user-actions';
import { openPage, pageOf, USERS } from '../../testing/users-page-harness';

describe('UserActions, through the users page', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  describe('dialogs', () => {
    afterEach(() => {
      document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => {
        overlay.replaceChildren();
      });
    });

    const inOverlay = () => document.querySelector('.cdk-overlay-container');
    const overlayButton = (name: string): HTMLButtonElement => {
      const button = [...(inOverlay()?.querySelectorAll('button') ?? [])].find((candidate) =>
        candidate.textContent.includes(name),
      );
      if (!button) throw new Error(`No "${name}" button in the overlay`);
      return button;
    };

    it('opens the create dialog with the route-provided service', async () => {
      const page = await openPage();
      page.nextRequest().flush(pageOf(2));
      await page.settle();

      page.buttonNamed('Create user').click();
      await page.settle();

      expect(inOverlay()?.querySelector('h2')?.textContent).toContain('Create user');
    });

    it('reloads the table in place and confirms once an edit is saved', async () => {
      const page = await openPage();
      page.nextRequest().flush(pageOf(2));
      await page.settle();
      page
        .host()
        .querySelector<HTMLButtonElement>('[aria-label="Actions for Riya Sharma"]')
        ?.click();
      await page.settle();
      overlayButton('Edit user').click();
      await page.settle();

      const department = inOverlay()?.querySelector<HTMLInputElement>(
        'input[formcontrolname="department"]',
      );
      if (!department) throw new Error('No department field');
      department.value = 'Accounts';
      department.dispatchEvent(new Event('input'));
      await page.settle();
      overlayButton('Save changes').click();
      page.http.expectOne(`${USERS}/riya`).flush({ ...RIYA, department: 'Accounts' });
      await page.settle();

      const reload = page.nextRequest();
      expect(page.host().textContent).toContain('Riya Sharma');
      expect(page.host().querySelector('mat-progress-bar')).not.toBeNull();
      reload.flush(pageOf(2));
      await page.settle();
      expect(inOverlay()?.textContent).toContain(USER_CONFIRMATIONS.saved);
    });

    const chooseFromMenu = async (
      page: Awaited<ReturnType<typeof openPage>>,
      row: string,
      item: string,
    ) => {
      page.host().querySelector<HTMLButtonElement>(`[aria-label="Actions for ${row}"]`)?.click();
      await page.settle();
      overlayButton(item).click();
      await page.settle();
    };
    const withRows = async (items?: unknown[]) => {
      const page = await openPage();
      page.nextRequest().flush(items ? pageOf(items.length, 1, items) : pageOf(2));
      await page.settle();
      return page;
    };

    it('disables a user only after the admin confirms, and says what it means', async () => {
      const page = await withRows();

      await chooseFromMenu(page, 'Riya Sharma', 'Disable user');
      page.http.expectNone(`${USERS}/riya`);
      expect(inOverlay()?.textContent).toContain('Disable Riya Sharma?');
      expect(inOverlay()?.textContent).toContain("They'll lose access on their next action.");
      overlayButton('Disable user').click();
      await page.settle();

      const request = page.http.expectOne(`${USERS}/riya`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ status: 'DISABLED' });
      request.flush({ ...RIYA, status: 'DISABLED' });
      await page.settle();
      page.nextRequest().flush(pageOf(2));
      await page.settle();
      expect(inOverlay()?.textContent).toContain(USER_CONFIRMATIONS.disabled);
    });

    it('sends nothing when the disable question is cancelled', async () => {
      const page = await withRows();

      await chooseFromMenu(page, 'Riya Sharma', 'Disable user');
      overlayButton('Cancel').click();
      await page.settle();

      page.http.expectNone(`${USERS}/riya`);
    });

    it('enables a disabled user at once, without asking', async () => {
      const page = await withRows([{ ...RIYA, status: 'DISABLED' }]);

      await chooseFromMenu(page, 'Riya Sharma', 'Enable user');

      const request = page.http.expectOne(`${USERS}/riya`);
      expect(request.request.body).toEqual({ status: 'ACTIVE' });
      request.flush(RIYA);
      await page.settle();
      page.nextRequest().flush(pageOf(1, 1, [RIYA]));
      await page.settle();
      expect(inOverlay()?.textContent).toContain(USER_CONFIRMATIONS.enabled);
    });

    it('says why in a snackbar when the server refuses a disable, and changes nothing', async () => {
      const page = await withRows();

      await chooseFromMenu(page, 'Riya Sharma', 'Disable user');
      overlayButton('Disable user').click();
      await page.settle();
      page.http
        .expectOne(`${USERS}/riya`)
        .flush(errorBody('LAST_ADMIN', 'At least one active admin must remain.'), {
          status: 409,
          statusText: 'Conflict',
        });
      await page.settle();

      expect(inOverlay()?.textContent).toContain('At least one active admin must remain.');
      page.http.expectNone((req) => req.url === USERS);
    });

    it('deletes after showing the count, then reloads the table and confirms', async () => {
      const page = await withRows();

      await chooseFromMenu(page, 'Riya Sharma', 'Delete user');
      page.http.expectOne(`${USERS}/riya`).flush({ ...RIYA, recordCount: 7 });
      await page.settle();
      expect(inOverlay()?.textContent).toContain('Their 7 service requests will be deleted too.');
      overlayButton('Delete user').click();
      await page.settle();
      const request = page.http.expectOne(`${USERS}/riya`);
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });
      await page.settle();

      page.nextRequest().flush(pageOf(1, 1, [MEERA]));
      await page.settle();
      expect(inOverlay()?.textContent).toContain(USER_CONFIRMATIONS.deleted);
    });
  });
});
