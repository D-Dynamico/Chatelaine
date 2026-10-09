import { type RequestLogEntry, type RequestOutcome } from '../../core/latency/request-log-store';

/**
 * The request timeline's bar math (docs/FRONTEND.md §19), kept apart from the component so
 * it can be tested as plain numbers: where each bar starts, how long it is, and how it
 * splits into the three segments.
 */

/** The axis is never shorter than this, so a 20 ms request is still a visible bar. */
export const MIN_SPAN_MS = 1_000;
/** With the clock off (reduced motion), a pending bar is drawn at this share of the axis. */
export const PENDING_FIXED_SHARE = 0.08;

const TICK_STEPS_MS = [100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000] as const;
const MAX_TICKS = 6;

export interface Durations {
  readonly totalMs: number;
  /** Time the server spent on purpose, from `Server-Timing` (§9). */
  readonly delayMs: number;
  /** Time the server spent working. */
  readonly workMs: number;
  /** What is left: the network and the browser. */
  readonly networkMs: number;
}

export interface TimelineRow {
  readonly id: number;
  readonly label: string;
  readonly outcome: RequestOutcome;
  readonly outcomeText: string;
  readonly isPending: boolean;
  /** Where the bar starts, and how long it is, as shares (0 to 100) of the axis. */
  readonly startPct: number;
  readonly widthPct: number;
  /** The three segments as shares (0 to 100) of the bar itself. They add up to 100. */
  readonly delayShare: number;
  readonly workShare: number;
  readonly networkShare: number;
  readonly durations: Durations;
  /** The row in words: what a screen reader announces, and what focus or hover shows. */
  readonly description: string;
}

export interface TimelineTick {
  readonly pct: number;
  readonly label: string;
}

export interface Timeline {
  readonly spanMs: number;
  readonly rows: readonly TimelineRow[];
  readonly ticks: readonly TimelineTick[];
}

/** "12 ms", "999 ms", "1 s", "1.3 s". */
export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${String(Math.round(ms))} ms`;
  return `${String(Number((ms / 1_000).toFixed(1)))} s`;
}

function outcomeText(entry: RequestLogEntry): string {
  const withStatus = (word: string): string =>
    entry.status !== null && entry.status > 0 ? `${word} ${String(entry.status)}` : word;
  switch (entry.outcome) {
    case 'ok':
      return withStatus('OK');
    case 'error':
      return withStatus('Error');
    case 'cancelled':
      return 'Cancelled';
    case 'timeout':
      return 'Timed out';
    case 'pending':
      return 'Pending';
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

function splitDurations(entry: RequestLogEntry, totalMs: number): Durations {
  if (entry.outcome === 'pending') return { totalMs, delayMs: 0, workMs: 0, networkMs: totalMs };
  const delayMs = clamp(entry.serverDelayMs ?? 0, 0, totalMs);
  const workMs = clamp(entry.serverWorkMs ?? 0, 0, totalMs - delayMs);
  return { totalMs, delayMs, workMs, networkMs: totalMs - delayMs - workMs };
}

function describeRow(
  label: string,
  text: string,
  durations: Durations,
  isPending: boolean,
): string {
  if (isPending) return `${label}: ${text}, ${formatDuration(durations.totalMs)} so far.`;
  return (
    `${label}: ${text}. Total ${formatDuration(durations.totalMs)}, ` +
    `simulated delay ${formatDuration(durations.delayMs)}, ` +
    `server work ${formatDuration(durations.workMs)}, ` +
    `network and browser ${formatDuration(durations.networkMs)}.`
  );
}

/** The smallest round step that keeps the axis to at most six ticks, and the span it gives. */
function roundAxis(spanMs: number): { stepMs: number; spanMs: number } {
  const stepMs =
    TICK_STEPS_MS.find((step) => spanMs / step <= MAX_TICKS) ?? TICK_STEPS_MS.at(-1) ?? 1_000;
  return { stepMs, spanMs: Math.ceil(spanMs / stepMs) * stepMs };
}

function tickLabel(ms: number): string {
  return ms === 0 ? '0' : formatDuration(ms);
}

/**
 * Lays out the log. `nowMs` is the clock that grows pending bars (`performance.now()`
 * time); `null` means the clock is off, and a pending bar is drawn at a fixed length.
 */
export function layoutTimeline(
  entries: readonly RequestLogEntry[],
  nowMs: number | null,
): Timeline {
  const originMs = entries.reduce((first, entry) => Math.min(first, entry.startedAt), Infinity);
  const endOf = (entry: RequestLogEntry): number =>
    entry.endedAt ?? (nowMs === null ? entry.startedAt : Math.max(nowMs, entry.startedAt));
  const lastMs = entries.reduce((last, entry) => Math.max(last, endOf(entry)), 0);
  const rawSpanMs = entries.length === 0 ? 0 : lastMs - originMs;
  const { stepMs, spanMs } = roundAxis(Math.max(rawSpanMs, MIN_SPAN_MS));

  const rows = entries.map((entry): TimelineRow => {
    const isPending = entry.outcome === 'pending';
    const totalMs = Math.max(endOf(entry) - entry.startedAt, 0);
    const durations = splitDurations(entry, totalMs);
    const isFixed = isPending && nowMs === null;
    const widthPct = isFixed ? PENDING_FIXED_SHARE * 100 : (totalMs / spanMs) * 100;
    const startPct = Math.min(((entry.startedAt - originMs) / spanMs) * 100, 100 - widthPct);
    const share = (ms: number): number => (totalMs === 0 ? 0 : (ms / totalMs) * 100);
    const delayShare = share(durations.delayMs);
    const workShare = share(durations.workMs);
    const label = `${entry.method} ${entry.url}`;
    const text = outcomeText(entry);
    return {
      id: entry.id,
      label,
      outcome: entry.outcome,
      outcomeText: text,
      isPending,
      startPct,
      widthPct,
      delayShare,
      workShare,
      networkShare: 100 - delayShare - workShare,
      durations,
      description: describeRow(label, text, durations, isPending),
    };
  });

  const ticks: TimelineTick[] = [];
  for (let ms = 0; ms <= spanMs; ms += stepMs) {
    ticks.push({ pct: (ms / spanMs) * 100, label: tickLabel(ms) });
  }
  return { spanMs, rows, ticks };
}
