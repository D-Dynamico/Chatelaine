/**
 * The source of "now" for anything that stamps a time. Services take a Clock instead of
 * calling `new Date()` so tests and the seed can pin time and stay deterministic.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function fixedClock(at: Date | string): Clock {
  const epochMs = new Date(at).getTime();
  if (Number.isNaN(epochMs)) {
    throw new RangeError(`fixedClock needs a valid date, got "${String(at)}"`);
  }
  // A fresh Date per call, so a caller mutating its copy cannot move time for others.
  return { now: () => new Date(epochMs) };
}
