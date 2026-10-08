/** Endpoint groups used by the latency lab and the request log (docs/FRONTEND.md §17). */

export type EndpointGroup = 'auth' | 'profile' | 'summary' | 'records' | 'admin' | 'health';

/** The groups the lab can delay or fail. `auth` and `health` always run at real speed. */
export const SIMULATED_GROUPS = ['profile', 'summary', 'records', 'admin'] as const;
export type SimulatedGroup = (typeof SIMULATED_GROUPS)[number];

/** Most specific first: `/records/summary` must not be read as `/records`. */
const GROUP_PREFIXES: readonly (readonly [string, EndpointGroup])[] = [
  ['/auth/', 'auth'],
  ['/me', 'profile'],
  ['/records/summary', 'summary'],
  ['/records', 'records'],
  ['/admin/', 'admin'],
  ['/health', 'health'],
];

/** The group of an API path such as `/records/summary`, or null for a path outside them. */
export function endpointGroupOf(path: string): EndpointGroup | null {
  const match = GROUP_PREFIXES.find(([prefix]) => path === prefix || path.startsWith(prefix));
  return match ? match[1] : null;
}

export function isSimulatedGroup(group: EndpointGroup | null): group is SimulatedGroup {
  return SIMULATED_GROUPS.some((simulated) => simulated === group);
}
