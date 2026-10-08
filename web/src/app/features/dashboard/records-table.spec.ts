import { TestBed } from '@angular/core/testing';
import { type AdminRecordItem } from '../../core/models/service-request';
import { type RecordsPage } from './dashboard-data.service';
import { ADMIN_COLUMNS, GENERAL_COLUMNS, RecordsTable, type TableSort } from './records-table';

const ITEM: AdminRecordItem = {
  id: 'SR-1042',
  title: 'Laptop battery swells after charging',
  category: 'HARDWARE',
  priority: 'HIGH',
  status: 'IN_PROGRESS',
  accessLevel: 'GENERAL',
  createdAt: '2026-09-22T06:15:00.000Z',
  updatedAt: '2026-09-24T10:40:00.000Z',
  ownerId: 'riya',
  ownerName: 'Riya Sharma',
  assignee: 'Dev Patel',
  internalNote: 'Swap under warranty; vendor ticket 7781.',
};

function render(isAdmin: boolean, items: readonly AdminRecordItem[] = [ITEM]) {
  const page: RecordsPage = { items, page: 1, pageSize: 10, total: items.length };
  const sort: TableSort = { field: 'createdAt', order: 'desc' };
  const fixture = TestBed.createComponent(RecordsTable);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('isAdmin', isAdmin);
  fixture.componentRef.setInput('sort', sort);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const headers = () =>
    [...host.querySelectorAll('th')].map((th) => th.textContent.trim()).filter(Boolean);
  return { fixture, host, headers };
}

describe('RecordsTable', () => {
  it('shows a General User exactly ID, title, category, priority, status and updated', () => {
    const { headers } = render(false);

    expect(GENERAL_COLUMNS).toEqual(['id', 'title', 'category', 'priority', 'status', 'updatedAt']);
    expect(headers()).toEqual(['ID', 'Title', 'Category', 'Priority', 'Status', 'Updated']);
  });

  it('never draws a masked field for a General User, even if an item carried one (§37)', () => {
    const { host } = render(false);

    expect(host.textContent).toContain('SR-1042');
    expect(host.textContent).not.toContain('Riya Sharma');
    expect(host.textContent).not.toContain('Dev Patel');
    expect(host.textContent).not.toContain('vendor ticket');
    expect(host.querySelector('.note-row')).toBeNull();
    expect(host.querySelector('app-access-chip')).toBeNull();
  });

  it('shows an Admin the owner, access level and assignee as well', () => {
    const { host, headers } = render(true);

    expect(ADMIN_COLUMNS).toContain('owner');
    expect(headers()).toEqual([
      'Internal note',
      'ID',
      'Title',
      'Owner',
      'Category',
      'Priority',
      'Status',
      'Access',
      'Assignee',
      'Updated',
    ]);
    expect(host.textContent).toContain('Riya Sharma');
    expect(host.textContent).toContain('Dev Patel');
    expect(host.querySelector('app-access-chip')?.textContent).toContain('General');
  });

  it('opens and closes the internal note for an Admin', async () => {
    const { fixture, host } = render(true);
    const toggle = host.querySelector<HTMLButtonElement>('button[aria-controls="note-SR-1042"]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(host.textContent).not.toContain('vendor ticket');

    toggle?.click();
    await fixture.whenStable();
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#note-SR-1042')?.textContent).toContain('vendor ticket 7781');

    toggle?.click();
    await fixture.whenStable();
    expect(host.querySelector('#note-SR-1042')).toBeNull();
  });

  it('offers no note toggle on a row without a note', () => {
    const { host } = render(true, [{ ...ITEM, internalNote: null }]);

    expect(host.querySelector('button[aria-controls]')).toBeNull();
    expect(host.textContent).not.toContain('Internal note' + 'SR');
  });

  it('reports sorting, and a cleared sort as the default order', () => {
    const { fixture, host } = render(false);
    const sorts: (TableSort | null)[] = [];
    fixture.componentInstance.sortChange.subscribe((sort) => sorts.push(sort));

    const priorityHeader = [...host.querySelectorAll<HTMLElement>('[mat-sort-header]')].find(
      (header) => header.textContent.includes('Priority'),
    );
    priorityHeader?.click();
    priorityHeader?.click();
    priorityHeader?.click();

    expect(sorts).toEqual([
      { field: 'priority', order: 'asc' },
      { field: 'priority', order: 'desc' },
      null,
    ]);
  });
});
