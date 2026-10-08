import { SIMULATED_GROUPS, type SimulatedGroup } from './endpoint-group';

/** What the latency lab controls (docs/FRONTEND.md §19). */

export const LOADING_STRATEGIES = ['independent', 'all-at-once', 'sequential'] as const;
export type LoadingStrategy = (typeof LOADING_STRATEGIES)[number];

/** The API refuses anything outside 0 to 10000 ms (docs/API.md §9). */
export const DELAY_LIMITS = { min: 0, max: 10_000 } as const;
export const TIMEOUT_LIMITS = { min: 2_000, max: 20_000, initial: 12_000 } as const;

export type GroupDelays = Readonly<Record<SimulatedGroup, number>>;

export interface LatencySettings {
  readonly delays: GroupDelays;
  readonly strategy: LoadingStrategy;
  readonly timeoutMs: number;
  /** Groups whose next request carries `fail=true`. Kept until a request takes the flag. */
  readonly armedFailures: readonly SimulatedGroup[];
}

export const INITIAL_DELAYS: GroupDelays = { profile: 0, summary: 0, records: 0, admin: 0 };

export const INITIAL_SETTINGS: LatencySettings = {
  delays: INITIAL_DELAYS,
  strategy: 'independent',
  timeoutMs: TIMEOUT_LIMITS.initial,
  armedFailures: [],
};

export function isWithin(value: unknown, limits: { min: number; max: number }): value is number {
  return Number.isInteger(value) && Number(value) >= limits.min && Number(value) <= limits.max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads settings saved by an earlier page load. Anything missing or out of range falls back
 * to its initial value, field by field, so one bad entry cannot reset the rest.
 */
export function parseSettings(saved: unknown): LatencySettings {
  if (!isRecord(saved)) return INITIAL_SETTINGS;
  const delays = isRecord(saved['delays']) ? saved['delays'] : {};
  const delayOf = (group: SimulatedGroup): number => {
    const delay = delays[group];
    return isWithin(delay, DELAY_LIMITS) ? delay : INITIAL_DELAYS[group];
  };
  const strategy = LOADING_STRATEGIES.find((known) => known === saved['strategy']);
  const timeoutMs = saved['timeoutMs'];
  const armed: unknown[] = Array.isArray(saved['armedFailures']) ? saved['armedFailures'] : [];
  return {
    delays: {
      profile: delayOf('profile'),
      summary: delayOf('summary'),
      records: delayOf('records'),
      admin: delayOf('admin'),
    },
    strategy: strategy ?? INITIAL_SETTINGS.strategy,
    timeoutMs: isWithin(timeoutMs, TIMEOUT_LIMITS) ? timeoutMs : INITIAL_SETTINGS.timeoutMs,
    armedFailures: SIMULATED_GROUPS.filter((group) => armed.includes(group)),
  };
}
