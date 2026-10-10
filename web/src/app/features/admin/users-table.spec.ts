import { TestBed } from '@angular/core/testing';
import { type UserView } from '../../core/models/user';
import { MEERA, RIYA } from '../../testing/fixtures';
import { type UsersPage } from './admin-users.service';
import { SELF_ACTION_REASONS } from './user-display';
import { type UserTableSort, UsersTable } from './users-table';

const DISABLED_KABIR: UserView = {
  ...RIYA,
  userId: 'kabir',
  displayName: 'Kabir Mehta',
  status: 'DISABLED',
  lastLoginAt: null,
};
const PAGE: UsersPage = { items: [MEERA, RIYA, DISABLED_KABIR], page: 1, pageSize: 10, total: 3 };
const DEFAULT_SORT: UserTableSort = { field: 'userId', order: 'asc' };

async function render(currentUserId = MEERA.userId, sort = DEFAULT_SORT) {
  const fixture = TestBed.createComponent(UsersTable);
  fixture.componentRef.setInput('page', PAGE);
  fixture.componentRef.setInput('sort', sort);
  fixture.componentRef.setInput('currentUserId', currentUserId);
  fixture.componentRef.setInput('now', new Date());
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const rowOf = (name: string): HTMLElement => {
    const row = [...host.querySelectorAll<HTMLElement>('tr.user-row')].find((candidate) =>
      candidate.textContent.includes(name),
    );
    if (!row) throw new Error(`No row for ${name}`);
    return row;
  };
  /** Opens a row's menu and returns its items, keyed by their data-action. */
  const openMenu = async (name: string) => {
    const trigger = rowOf(name).querySelector<HTMLButtonElement>('button[aria-label^="Actions"]');
    if (!trigger) throw new Error(`No actions button for ${name}`);
    trigger.click();
    await fixture.whenStable();
    const items = [...document.querySelectorAll<HTMLButtonElement>('[mat-menu-item]')];
    return new Map(items.map((item) => [item.dataset['action'] ?? '', item]));
  };
  return { fixture, host, rowOf, openMenu };
}

describe('UsersTable', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => {
      overlay.replaceChildren();
    });
  });

  it('marks only the signed-in admin\'s row as "You"', async () => {
    const table = await render();

    expect(table.rowOf('Meera Nair').querySelector('.you')?.textContent).toBe('You');
    expect(table.rowOf('Riya Sharma').querySelector('.you')).toBeNull();
  });

  it('offers Disable and Delete on your own row only as disabled items that say why', async () => {
    const table = await render();
    const disabledCalls = vi.fn();
    table.fixture.componentInstance.disable.subscribe(disabledCalls);
    table.fixture.componentInstance.remove.subscribe(disabledCalls);

    const items = await table.openMenu('Meera Nair');
    const disable = items.get('disable');
    const remove = items.get('delete');

    expect(disable?.getAttribute('aria-disabled')).toBe('true');
    expect(remove?.getAttribute('aria-disabled')).toBe('true');
    expect(tooltipOf(disable)).toBe(SELF_ACTION_REASONS.disable);
    expect(tooltipOf(remove)).toBe(SELF_ACTION_REASONS.delete);
    disable?.click();
    remove?.click();
    expect(disabledCalls).not.toHaveBeenCalled();
  });

  it("offers every action on another user's row", async () => {
    const table = await render();
    const removed = vi.fn();
    table.fixture.componentInstance.remove.subscribe(removed);

    const items = await table.openMenu('Riya Sharma');

    expect(items.get('edit')?.getAttribute('aria-disabled')).not.toBe('true');
    expect(items.get('disable')?.getAttribute('aria-disabled')).not.toBe('true');
    expect(items.get('delete')?.getAttribute('aria-disabled')).not.toBe('true');
    items.get('delete')?.click();
    expect(removed).toHaveBeenCalledWith(RIYA);
  });

  it('offers Enable instead of Disable for a disabled user', async () => {
    const table = await render();

    const items = await table.openMenu('Kabir Mehta');

    expect(items.has('enable')).toBe(true);
    expect(items.has('disable')).toBe(false);
  });

  it('shows roles and statuses in words, and "Never" for a user who never signed in', async () => {
    const table = await render();
    const text = (name: string) => table.rowOf(name).textContent.replace(/\s+/g, ' ');

    expect(text('Meera Nair')).toContain('Admin');
    expect(text('Riya Sharma')).toContain('General User');
    expect(text('Kabir Mehta')).toContain('Disabled');
    expect(text('Kabir Mehta')).toContain('Never');
    expect(table.host.textContent).not.toMatch(/GENERAL|ADMIN|ACTIVE|DISABLED/);
  });

  it('shows no column as sorted for the default order, and the active one otherwise', async () => {
    const byDefault = await render();
    expect(byDefault.host.querySelector('[aria-sort="ascending"]')).toBeNull();
    byDefault.fixture.destroy();

    const byRole = await render(MEERA.userId, { field: 'role', order: 'desc' });
    expect(byRole.host.querySelector('[aria-sort="descending"]')?.textContent).toContain('Role');
  });
});

/** The tooltip message Material keeps for an element, read through its described-by text. */
function tooltipOf(element: HTMLElement | undefined): string | null {
  const id = element?.getAttribute('aria-describedby');
  if (!id) return null;
  return document.getElementById(id)?.textContent.trim() ?? null;
}
