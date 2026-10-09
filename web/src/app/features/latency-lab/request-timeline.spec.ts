import { TestBed } from '@angular/core/testing';
import { type RequestLogEntry } from '../../core/latency/request-log-store';
import { PENDING_FIXED_SHARE } from './timeline-geometry';
import { RequestTimeline, TIMELINE_EMPTY_MESSAGE } from './request-timeline';

let nextId = 1;
function entry(overrides: Partial<RequestLogEntry> & { startedAt: number }): RequestLogEntry {
  return {
    id: nextId++,
    group: 'records',
    method: 'GET',
    url: '/records?page=1',
    endedAt: overrides.startedAt + 100,
    outcome: 'ok',
    status: 200,
    serverDelayMs: null,
    serverWorkMs: null,
    ...overrides,
  };
}

const ENTRIES: readonly RequestLogEntry[] = [
  entry({ startedAt: 0, endedAt: 400, url: '/me', serverDelayMs: 300, serverWorkMs: 20 }),
  entry({ startedAt: 50, endedAt: 600, url: '/records/summary', outcome: 'error', status: 503 }),
  entry({ startedAt: 100, endedAt: 450, url: '/records', outcome: 'cancelled', status: null }),
  entry({ startedAt: 120, endedAt: 900, url: '/admin/users', outcome: 'timeout', status: null }),
  entry({ startedAt: 700, endedAt: null, url: '/me', outcome: 'pending', status: null }),
];

async function render(entries: readonly RequestLogEntry[] = ENTRIES, now: number | null = 1_000) {
  const fixture = TestBed.createComponent(RequestTimeline);
  fixture.componentRef.setInput('entries', entries);
  fixture.componentRef.setInput('now', now);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const rows = () => [...host.querySelectorAll<HTMLElement>('li.row')];
  /** Presses a key on the focused row, or on the first when none has focus. */
  const press = (key: string) => {
    const target = rows().find((row) => row === document.activeElement) ?? rows()[0];
    target?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };
  return { fixture, host, rows, press };
}

describe('RequestTimeline', () => {
  it('shows a row per request, oldest first, newest at the bottom', async () => {
    const { rows } = await render();

    expect(rows().map((row) => row.querySelector('.label')?.textContent)).toEqual([
      'GET /me',
      'GET /records/summary',
      'GET /records',
      'GET /admin/users',
      'GET /me',
    ]);
  });

  it('says every outcome in words, so it is never shown by color alone', async () => {
    const { rows } = await render();

    expect(rows().map((row) => row.querySelector('.outcome')?.textContent)).toEqual([
      'OK 200',
      'Error 503',
      'Cancelled',
      'Timed out',
      'Pending',
    ]);
    const outcomes = ['ok', 'error', 'cancelled', 'timeout', 'pending'];
    expect(
      rows().map((row) => outcomes.filter((outcome) => row.classList.contains(outcome))),
    ).toEqual([['ok'], ['error'], ['cancelled'], ['timeout'], ['pending']]);
  });

  it('gives each row its full description as its accessible name', async () => {
    const { rows } = await render();

    expect(rows()[0]?.getAttribute('aria-label')).toBe(
      'GET /me: OK 200. Total 400 ms, simulated delay 300 ms, server work 20 ms, network and browser 80 ms.',
    );
  });

  it('splits each bar into the three segments in proportion', async () => {
    const { rows } = await render();
    const segments = [...(rows()[0]?.querySelectorAll<HTMLElement>('.seg') ?? [])];

    expect(segments.map((seg) => Math.round(parseFloat(seg.style.flexBasis)))).toEqual([75, 5, 20]);
  });

  it('draws a pending bar at a fixed length when the clock is off', async () => {
    const { rows } = await render(ENTRIES, null);
    const bar = rows().at(-1)?.querySelector<HTMLElement>('.bar');

    expect(parseFloat(bar?.style.width ?? '0')).toBeCloseTo(PENDING_FIXED_SHARE * 100);
  });

  it('grows a pending bar with the clock', async () => {
    const early = await render(ENTRIES, 800);
    const later = await render(ENTRIES, 1_600);
    const width = (view: typeof early) =>
      parseFloat(view.rows().at(-1)?.querySelector<HTMLElement>('.bar')?.style.width ?? '0');

    expect(width(later)).toBeGreaterThan(width(early));
  });

  it('shows an empty message and cannot be cleared when there is nothing to show', async () => {
    const { host } = await render([]);

    expect(host.textContent).toContain(TIMELINE_EMPTY_MESSAGE);
    expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
  });

  it('emits clear', async () => {
    const { fixture, host } = await render();
    const cleared = vi.fn();
    fixture.componentInstance.clear.subscribe(cleared);

    host.querySelector<HTMLButtonElement>('button')?.click();

    expect(cleared).toHaveBeenCalledOnce();
  });

  describe('by keyboard', () => {
    it('is one tab stop: the first row, until another is chosen', async () => {
      const { rows } = await render();

      expect(rows().map((row) => row.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    });

    it('moves with the arrow keys, Home and End, and the tab stop follows', async () => {
      const { fixture, rows, press } = await render();
      const focused = () => rows().findIndex((row) => row === document.activeElement);
      document.body.append(fixture.nativeElement as HTMLElement);

      rows()[0]?.focus();
      press('ArrowDown');
      press('ArrowDown');
      expect(focused()).toBe(2);
      expect(rows().map((row) => row.tabIndex)).toEqual([-1, -1, 0, -1, -1]);

      press('End');
      expect(focused()).toBe(4);
      press('ArrowDown');
      expect(focused()).toBe(4);

      press('Home');
      expect(focused()).toBe(0);
      press('ArrowUp');
      expect(focused()).toBe(0);
      (fixture.nativeElement as HTMLElement).remove();
    });

    it('ignores other keys, so it never swallows Tab', async () => {
      const { rows, press } = await render();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

      rows()[0]?.dispatchEvent(tab);
      press('a');

      expect(tab.defaultPrevented).toBe(false);
    });
  });
});
