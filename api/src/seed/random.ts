/**
 * A seeded random source, so the seed writes the same data on every run and every machine.
 * The generator is mulberry32: tiny, fast, and plenty for demo data (not for security).
 */
export interface Random {
  /** A float in [0, 1). */
  next(): number;
  /** An integer from min to max, both included. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** True with the given probability. */
  chance(probability: number): boolean;
  /** Picks a key with probability proportional to its weight. */
  weighted<K extends string>(weights: Readonly<Record<K, number>>): K;
  shuffle<T>(items: readonly T[]): T[];
}

const UINT32 = 2 ** 32;

export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));

  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new RangeError('pick needs at least one item');
    return item;
  };

  return {
    next,
    int,
    pick,
    chance: (probability) => next() < probability,
    weighted: <K extends string>(weights: Readonly<Record<K, number>>): K => {
      const entries = Object.entries(weights) as [K, number][];
      let roll = next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
      }
      return pick(entries)[0];
    },
    shuffle: <T>(items: readonly T[]): T[] => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
      }
      return copy;
    },
  };
}
