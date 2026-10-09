import { type RequestLogEntry } from '../../core/latency/request-log-store';
import {
  MIN_SPAN_MS,
  PENDING_FIXED_SHARE,
  formatDuration,
  layoutTimeline,
} from './timeline-geometry';

let nextId = 1;
function entry(overrides: Partial<RequestLogEntry> & { startedAt: number }): RequestLogEntry {
  return {
    id: nextId++,
    group: 'records',
    method: 'GET',
    url: '/records?page=1',
    endedAt: overrides.startedAt + 100,
    outcome: 'ok',
    status: 200,
    serverDelayMs: null,
    serverWorkMs: null,
    ...overrides,
  };
}

describe('formatDuration', () => {
  it.each([
    [0, '0 ms'],
    [12.4, '12 ms'],
    [999, '999 ms'],
    [1000, '1 s'],
    [1250, '1.3 s'],
    [10_000, '10 s'],
  ])('writes %f ms as %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe('layoutTimeline', () => {
  it('starts the axis at the first request, and places each row by its start', () => {
    const timeline = layoutTimeline(
      [entry({ startedAt: 5_000, endedAt: 5_500 }), entry({ startedAt: 5_500, endedAt: 6_000 })],
      6_000,
    );

    expect(timeline.spanMs).toBe(MIN_SPAN_MS);
    expect(timeline.rows[0]).toMatchObject({ startPct: 0, widthPct: 50 });
    expect(timeline.rows[1]).toMatchObject({ startPct: 50, widthPct: 50 });
  });

  it('splits a bar into simulated delay, server work and the network remainder', () => {
    const [row] = layoutTimeline(
      [entry({ startedAt: 0, endedAt: 1_000, serverDelayMs: 600, serverWorkMs: 100 })],
      1_000,
    ).rows;

    expect(row?.durations).toEqual({ totalMs: 1_000, delayMs: 600, workMs: 100, networkMs: 300 });
    expect([row?.delayShare, row?.workShare, row?.networkShare]).toEqual([60, 10, 30]);
  });

  it('draws all of a bar as network time when the server sent no timing', () => {
    const [row] = layoutTimeline([entry({ startedAt: 0, endedAt: 400 })], 400).rows;

    expect(row?.durations).toMatchObject({ delayMs: 0, workMs: 0, networkMs: 400 });
    expect(row?.networkShare).toBe(100);
  });

  it('never lets reported server time exceed the time the request took', () => {
    const [row] = layoutTimeline(
      [entry({ startedAt: 0, endedAt: 100, serverDelayMs: 500, serverWorkMs: 500 })],
      100,
    ).rows;

    expect(row?.durations).toEqual({ totalMs: 100, delayMs: 100, workMs: 0, networkMs: 0 });
  });

  it('keeps a very short request visible by never shrinking the axis below a floor', () => {
    const [row] = layoutTimeline([entry({ startedAt: 0, endedAt: 20 })], 20).rows;

    expect(row?.widthPct).toBeCloseTo(2);
  });

  it('stretches the axis to a round number of seconds that holds the whole span', () => {
    const timeline = layoutTimeline([entry({ startedAt: 0, endedAt: 3_400 })], 3_400);

    expect(timeline.spanMs).toBe(4_000);
    expect(timeline.ticks.map((tick) => tick.label)).toEqual(['0', '1 s', '2 s', '3 s', '4 s']);
    expect(timeline.ticks.at(-1)?.pct).toBe(100);
  });

  it('grows a pending request with the clock, as all network time', () => {
    const pending = entry({ startedAt: 0, endedAt: null, outcome: 'pending', status: null });

    const [early] = layoutTimeline([pending], 300).rows;
    const [later] = layoutTimeline([pending], 700).rows;

    expect(early?.durations.totalMs).toBe(300);
    expect(later?.durations.totalMs).toBe(700);
    expect(later?.networkShare).toBe(100);
    expect(later?.isPending).toBe(true);
  });

  it('draws a pending request at a fixed length when the clock is off (reduced motion)', () => {
    const pending = entry({ startedAt: 200, endedAt: null, outcome: 'pending', status: null });

    const [row] = layoutTimeline([pending], null).rows;

    expect(row?.widthPct).toBeCloseTo(PENDING_FIXED_SHARE * 100);
    expect((row?.startPct ?? 0) + (row?.widthPct ?? 0)).toBeLessThanOrEqual(100);
  });

  it.each([
    [{ outcome: 'ok', status: 200 }, 'OK 200'],
    [{ outcome: 'error', status: 503 }, 'Error 503'],
    [{ outcome: 'error', status: 0 }, 'Error'],
    [{ outcome: 'cancelled', status: null }, 'Cancelled'],
    [{ outcome: 'timeout', status: null }, 'Timed out'],
    [{ outcome: 'pending', status: null, endedAt: null }, 'Pending'],
  ] as const)('says %j in words: %s', (fields, text) => {
    const [row] = layoutTimeline([entry({ startedAt: 0, ...fields })], 100).rows;

    expect(row?.outcomeText).toBe(text);
  });

  it('describes each row for people who cannot see the bar', () => {
    const [row] = layoutTimeline(
      [entry({ startedAt: 0, endedAt: 1_000, serverDelayMs: 600, serverWorkMs: 100 })],
      1_000,
    ).rows;

    expect(row?.description).toBe(
      'GET /records?page=1: OK 200. Total 1 s, simulated delay 600 ms, server work 100 ms, network and browser 300 ms.',
    );
  });

  it('is empty with no requests', () => {
    expect(layoutTimeline([], 0)).toMatchObject({ rows: [], spanMs: MIN_SPAN_MS });
  });
});
