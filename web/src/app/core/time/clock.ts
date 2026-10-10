import { DOCUMENT } from '@angular/common';
import { Injectable, type Signal, inject, signal } from '@angular/core';

/** Relative times are shown to the minute, so twice a minute is never visibly late. */
export const CLOCK_TICK_MS = 30_000;

/**
 * The current time as a signal, shared by every relative time in the app (§40). One timer
 * for the whole app, not one per row. A hidden tab's timers are throttled, so the clock
 * also catches up the moment the tab is shown again rather than on its next tick.
 */
@Injectable({ providedIn: 'root' })
export class Clock {
  private readonly current = signal(new Date());
  readonly now: Signal<Date> = this.current.asReadonly();

  constructor() {
    const document = inject(DOCUMENT);
    const tick = () => {
      this.current.set(new Date());
    };
    // A root service lives as long as the app, so neither needs removing.
    setInterval(tick, CLOCK_TICK_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick();
    });
  }
}
