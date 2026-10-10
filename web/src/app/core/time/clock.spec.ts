import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RelativeTime } from '../../shared/ui/relative-time';
import { CLOCK_TICK_MS, Clock } from './clock';

const START = new Date('2026-10-10T12:00:00Z');

/** Wired as the containers wire it: the clock's signal into a relative time. */
@Component({
  imports: [RelativeTime],
  template: `<app-relative-time [at]="at" [now]="now()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  protected readonly at = START.toISOString();
  protected readonly now = inject(Clock).now;
}

describe('Clock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: START });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // detectChanges, not whenStable: under fake timers whenStable waits on a timer that
  // never fires.
  it('moves a relative time on while the page stays open', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const text = () => (fixture.nativeElement as HTMLElement).textContent.trim();
    expect(text()).toBe('just now');

    vi.advanceTimersByTime(5 * 60 * 1000);
    fixture.detectChanges();

    expect(text()).toBe('5 minutes ago');
  });

  it('catches up as soon as a hidden tab is shown, without waiting for a tick', () => {
    const clock = TestBed.inject(Clock);
    const visibility = vi.spyOn(document, 'visibilityState', 'get');

    vi.setSystemTime(START.getTime() + CLOCK_TICK_MS / 2);
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(clock.now()).toEqual(START);

    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(clock.now().getTime()).toBe(START.getTime() + CLOCK_TICK_MS / 2);
  });
});
