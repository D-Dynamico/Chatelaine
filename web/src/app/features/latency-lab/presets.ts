import { type SimulatedGroup } from '../../core/latency/endpoint-group';
import { type GroupDelays } from '../../core/latency/latency-settings';

/**
 * The lab's presets (docs/FRONTEND.md §19). A preset is a set of delays, not state of its
 * own: choosing one sets the sliders, and which one looks chosen is whichever the sliders
 * currently equal, so moving a slider un-chooses it with nothing to keep in sync.
 */
export interface LatencyPreset {
  readonly id: 'instant' | 'realistic' | 'slow-network' | 'staggered';
  readonly label: string;
  readonly delays: GroupDelays;
}

export const LATENCY_PRESETS: readonly LatencyPreset[] = [
  {
    id: 'instant',
    label: 'Instant',
    delays: { profile: 0, summary: 0, records: 0, admin: 0 },
  },
  {
    id: 'realistic',
    label: 'Realistic',
    delays: { profile: 300, summary: 900, records: 1_600, admin: 500 },
  },
  {
    id: 'slow-network',
    label: 'Slow network',
    delays: { profile: 2_500, summary: 3_200, records: 4_000, admin: 3_000 },
  },
  // Profile slowest and records fastest, so the panels finish in the reverse of their
  // order on the page: the clearest way to see independent loading.
  {
    id: 'staggered',
    label: 'Staggered',
    delays: { profile: 3_000, summary: 1_500, records: 500, admin: 500 },
  },
];

const GROUPS: readonly SimulatedGroup[] = ['profile', 'summary', 'records', 'admin'];

/** The preset the delays equal exactly, if any. */
export function matchingPreset(delays: GroupDelays): LatencyPreset | undefined {
  return LATENCY_PRESETS.find((preset) =>
    GROUPS.every((group) => preset.delays[group] === delays[group]),
  );
}

/** How each group is named in the lab: what the dashboard calls it, and its path. */
export const GROUP_LABELS: Readonly<Record<SimulatedGroup, { name: string; path: string }>> = {
  profile: { name: 'Profile', path: '/me' },
  summary: { name: 'Summary', path: '/records/summary' },
  records: { name: 'Records', path: '/records' },
  admin: { name: 'Admin', path: '/admin/*' },
};
