import { describe, expect, it } from 'vitest';
import { fixedClock, systemClock } from '../../src/lib/clock.js';

describe('systemClock', () => {
  it('reports the current time', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('fixedClock', () => {
  it('always reports the pinned instant', () => {
    const clock = fixedClock('2026-10-07T09:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-10-07T09:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-10-07T09:00:00.000Z');
  });

  it('is not moved when a caller mutates the date it was given', () => {
    const clock = fixedClock('2026-10-07T09:00:00.000Z');
    clock.now().setUTCFullYear(1999);
    expect(clock.now().toISOString()).toBe('2026-10-07T09:00:00.000Z');
  });

  it('rejects an invalid date instead of reporting NaN later', () => {
    expect(() => fixedClock('not a date')).toThrow(RangeError);
  });
});
