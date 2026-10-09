import { type Signal, effect, signal } from '@angular/core';

/**
 * Whether the user asked for less motion. Read once and kept current; a browser without
 * `matchMedia` (such as the test environment) reports false.
 */
export function injectPrefersReducedMotion(): Signal<boolean> {
  const query =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const prefers = signal(query?.matches ?? false);
  query?.addEventListener('change', (event) => {
    prefers.set(event.matches);
  });
  return prefers.asReadonly();
}

/**
 * The clock that grows pending bars on the timeline (§19): the time in `performance.now()`
 * terms, or `null` when it is off. It ticks once per animation frame, and only while
 * `isActive()` is true, so an idle page runs no loop at all. It is off, and stays `null`,
 * when the user prefers reduced motion; the timeline then draws pending bars at a fixed
 * length (§26). Call it in an injection context.
 */
export function injectAnimationClock(isActive: () => boolean): Signal<number | null> {
  const prefersReducedMotion = injectPrefersReducedMotion();
  const now = signal<number | null>(performance.now());

  effect((onCleanup) => {
    if (prefersReducedMotion()) {
      now.set(null);
      return;
    }
    if (!isActive()) return;
    let frame = 0;
    const tick = (): void => {
      now.set(performance.now());
      frame = requestAnimationFrame(tick);
    };
    now.set(performance.now());
    frame = requestAnimationFrame(tick);
    onCleanup(() => {
      cancelAnimationFrame(frame);
    });
  });

  return now.asReadonly();
}
