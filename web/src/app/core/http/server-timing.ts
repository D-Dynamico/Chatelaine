/** Where the server spent its time, from `Server-Timing: delay;dur=1500, app;dur=12` (§9). */
export interface ServerTiming {
  readonly serverDelayMs: number | null;
  readonly serverWorkMs: number | null;
}

export const NO_SERVER_TIMING: ServerTiming = { serverDelayMs: null, serverWorkMs: null };

function durationsByName(header: string): Map<string, number> {
  const durations = new Map<string, number>();
  for (const metric of header.split(',')) {
    const [name = '', ...params] = metric.split(';').map((part) => part.trim());
    const duration = params.find((param) => param.startsWith('dur='));
    const value = Number(duration?.slice('dur='.length));
    if (name && duration && Number.isFinite(value)) durations.set(name, value);
  }
  return durations;
}

export function parseServerTiming(header: string | null): ServerTiming {
  if (!header) return NO_SERVER_TIMING;
  const durations = durationsByName(header);
  return {
    serverDelayMs: durations.get('delay') ?? null,
    serverWorkMs: durations.get('app') ?? null,
  };
}
