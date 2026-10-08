import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccessChip } from './access-chip';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { PriorityMark } from './priority-mark';
import { describeSince } from './relative-time';
import { StatusChip } from './status-chip';

function render<T>(type: Type<T>, inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(type);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('shared presentational pieces', () => {
  it('access chip: the word is always there, and Admin-level adds a lock', () => {
    const general = render(AccessChip, { tone: 'general', label: 'General' }).host;
    const admin = render(AccessChip, { tone: 'admin', label: 'Admin' }).host;

    expect(general.textContent.trim()).toBe('General');
    expect(general.querySelector('mat-icon')).toBeNull();
    expect(admin.textContent).toContain('Admin');
    expect(admin.querySelector('mat-icon')?.textContent).toBe('lock');
    expect(admin.classList).toContain('admin');
  });

  it('status chip shows its word beside the icon', () => {
    const { host } = render(StatusChip, { label: 'In progress', icon: 'pending' });

    expect(host.textContent).toContain('In progress');
  });

  it('priority mark fills as many bars as the level, and says the word', () => {
    const { host } = render(PriorityMark, { level: 3, label: 'High' });

    expect(host.querySelectorAll('.bar.filled')).toHaveLength(3);
    expect(host.querySelectorAll('.bar')).toHaveLength(4);
    expect(host.textContent).toContain('High');
  });

  it('empty state offers its action only when given one', () => {
    const plain = render(EmptyState, { message: 'No requests yet.' }).host;
    const { fixture, host } = render(EmptyState, {
      message: 'No requests match these filters.',
      actionLabel: 'Clear filters',
    });
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);

    expect(plain.querySelector('button')).toBeNull();
    host.querySelector('button')?.click();
    expect(action).toHaveBeenCalledOnce();
  });

  it('error state says what failed, shows the code, and retries', () => {
    const { fixture, host } = render(ErrorState, {
      message: "Couldn't load the summary.",
      failure: { status: 503, code: 'SIMULATED_FAILURE', message: 'Simulated failure.' },
    });
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    expect(host.getAttribute('role')).toBe('alert');
    expect(host.textContent).toContain("Couldn't load the summary.");
    expect(host.textContent).toContain('503 SIMULATED_FAILURE');
    host.querySelector('button')?.click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('error state leaves out a status the client never got', () => {
    const { host } = render(ErrorState, {
      message: "Couldn't load requests.",
      failure: { status: 0, code: 'CLIENT_TIMEOUT', message: 'The server took too long.' },
    });

    expect(host.querySelector('.code')?.textContent.trim()).toBe('CLIENT_TIMEOUT');
  });

  it.each([
    [-20 * 1000, 'just now'],
    [-5 * 60 * 1000, '5 minutes ago'],
    [-2 * 3600 * 1000, '2 hours ago'],
    [-26 * 3600 * 1000, 'yesterday'],
    [-15 * 24 * 3600 * 1000, '2 weeks ago'],
  ])('relative time for %i ms is "%s"', (offset, text) => {
    const now = new Date('2026-10-08T12:00:00Z');

    expect(describeSince(new Date(now.getTime() + offset), now)).toBe(text);
  });
});
