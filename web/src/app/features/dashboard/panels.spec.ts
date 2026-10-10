import { type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type RecordSummary } from '../../core/models/service-request';
import { type LoadState } from '../../shared/load-state/load-state';
import { MEERA, RIYA } from '../../testing/fixtures';
import { ACCESS_SENTENCES, ProfilePanel } from './profile-panel';
import { SummaryPanel } from './summary-panel';

const failure = { status: 503, code: 'SIMULATED_FAILURE', message: 'Simulated failure.' };

function render<T extends { retry: { subscribe: (fn: () => void) => unknown } }, D>(
  type: Type<T>,
  state: LoadState<D>,
) {
  const fixture = TestBed.createComponent(type);
  fixture.componentRef.setInput('state', state);
  fixture.detectChanges();
  const retry = vi.fn();
  fixture.componentInstance.retry.subscribe(retry);
  return { host: fixture.nativeElement as HTMLElement, retry };
}

const summary = (overrides: Partial<RecordSummary> = {}): RecordSummary => ({
  scope: 'OWN',
  total: 17,
  byStatus: { OPEN: 5, IN_PROGRESS: 4, RESOLVED: 6, CLOSED: 2 },
  byPriority: { LOW: 4, MEDIUM: 7, HIGH: 4, CRITICAL: 2 },
  byAccessLevel: { GENERAL: 17 },
  ...overrides,
});

describe('ProfilePanel (the access card)', () => {
  it('shows a skeleton and is busy while loading', () => {
    const { host } = render(ProfilePanel, { status: 'loading' });

    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
  });

  it('tells a General User what they can and cannot see', () => {
    const { host } = render(ProfilePanel, { status: 'loaded', data: RIYA, isRefreshing: false });

    expect(host.getAttribute('aria-busy')).toBe('false');
    expect(host.textContent).toContain('Riya Sharma');
    expect(host.textContent).toContain('General User');
    expect(host.textContent).toContain(ACCESS_SENTENCES.GENERAL);
    expect(host.classList).not.toContain('admin');
  });

  it('tells an Admin they see everything, under a brass edge', () => {
    const { host } = render(ProfilePanel, { status: 'loaded', data: MEERA, isRefreshing: false });

    expect(host.textContent).toContain(ACCESS_SENTENCES.ADMIN);
    expect(host.classList).toContain('admin');
  });

  it('shows the sign-in before this one, never the one that is happening now', () => {
    const user = { ...RIYA, lastLoginAt: '2026-10-08T08:00:00.000Z' };
    const { host } = render(ProfilePanel, { status: 'loaded', data: user, isRefreshing: false });

    expect(host.textContent).toContain('Last signed in');
    expect(host.querySelector('time')?.getAttribute('datetime')).toBe(RIYA.previousLoginAt);
  });

  it('says "First sign-in" for a user with no earlier sign-in', () => {
    const user = { ...RIYA, previousLoginAt: null };
    const { host } = render(ProfilePanel, { status: 'loaded', data: user, isRefreshing: false });

    expect(host.textContent).toContain('First sign-in');
    expect(host.textContent).not.toContain('Last signed in');
    expect(host.querySelector('time')).toBeNull();
  });

  it('says it could not load the profile, and retries', () => {
    const { host, retry } = render(ProfilePanel, { status: 'error', error: failure });

    expect(host.textContent).toContain("Couldn't load your profile.");
    host.querySelector('button')?.click();
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe('SummaryPanel', () => {
  it('shows the total, the counts in workflow order, and the critical ones', () => {
    const { host } = render(SummaryPanel, {
      status: 'loaded',
      data: summary(),
      isRefreshing: false,
    });

    expect(host.querySelector('.total')?.textContent).toBe('17 requests');
    const counts = [...host.querySelectorAll('.counts li')].map((li) =>
      li.textContent.replace(/\s+/g, ' ').trim(),
    );
    expect(counts).toEqual(['Open 5', 'In progress 4', 'Resolved 6', 'Closed 2', 'Critical 2']);
    expect(host.querySelector('.bar')?.getAttribute('aria-label')).toBe(
      'By status: Open 5, In progress 4, Resolved 6, Closed 2',
    );
  });

  it('shows the split by access level to admins only', () => {
    const general = render(SummaryPanel, {
      status: 'loaded',
      data: summary(),
      isRefreshing: false,
    });
    const admin = render(SummaryPanel, {
      status: 'loaded',
      data: summary({ scope: 'ALL', total: 60, byAccessLevel: { GENERAL: 48, ADMIN: 12 } }),
      isRefreshing: false,
    });

    expect(general.host.querySelector('.access')).toBeNull();
    expect(admin.host.querySelector('.access')?.textContent.replace(/\s+/g, ' ')).toContain(
      'Admin 12',
    );
  });

  it('says there are no requests yet when empty', () => {
    const { host } = render(SummaryPanel, {
      status: 'empty',
      isRefreshing: false,
    });

    expect(host.textContent).toContain('No requests yet.');
  });

  it('says it could not load the summary, and retries', () => {
    const { host, retry } = render(SummaryPanel, { status: 'error', error: failure });

    expect(host.textContent).toContain("Couldn't load the summary.");
    host.querySelector('button')?.click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
