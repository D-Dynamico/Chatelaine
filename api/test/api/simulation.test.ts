import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectErrorShape } from '../helpers/error-shape.js';
import { useTestContext } from '../helpers/test-app.js';

// An unmatched /api path is delayed and failed like any other route, and keeps these tests
// about the simulation alone, with no login or store involved.
const ANY_ROUTE = '/api/probe';
const SMALL_DELAY_MS = 150;

async function timed(run: () => Promise<request.Response>) {
  const startedAt = performance.now();
  const res = await run();
  return { res, elapsedMs: performance.now() - startedAt };
}

describe('?delay and ?fail', () => {
  const context = useTestContext();

  it('holds the response for the requested time and reports it in Server-Timing', async () => {
    const { res, elapsedMs } = await timed(() =>
      request(context().app).get(`${ANY_ROUTE}?delay=${String(SMALL_DELAY_MS)}`),
    );
    expect(res.status).toBe(404);
    expect(elapsedMs).toBeGreaterThanOrEqual(SMALL_DELAY_MS);
    expect(res.headers['server-timing']).toMatch(/^delay;dur=150, app;dur=\d+\.\d$/);
  });

  it('accepts delay=0', async () => {
    const res = await request(context().app).get(`${ANY_ROUTE}?delay=0`).expect(404);
    expect(res.headers['server-timing']).toMatch(/^delay;dur=0,/);
  });

  it.each(['-1', '10001', 'abc', '1.5', '1e3', ''])('rejects delay=%s with 400', async (value) => {
    const res = await request(context().app).get(`${ANY_ROUTE}?delay=${value}`).expect(400);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
    expect(res.body).toMatchObject({ error: { details: [{ path: 'delay' }] } });
  });

  it('rejects a repeated delay parameter instead of picking one', async () => {
    const res = await request(context().app).get(`${ANY_ROUTE}?delay=1&delay=2`).expect(400);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
  });

  it('fails with 503 SIMULATED_FAILURE, after the delay', async () => {
    const { res, elapsedMs } = await timed(() =>
      request(context().app).get(`${ANY_ROUTE}?delay=${String(SMALL_DELAY_MS)}&fail=true`),
    );
    expect(res.status).toBe(503);
    expectErrorShape(res.body, 'SIMULATED_FAILURE');
    expect(elapsedMs).toBeGreaterThanOrEqual(SMALL_DELAY_MS);
  });

  it.each(['yes', 'false', '1'])('rejects fail=%s with 400', async (value) => {
    const res = await request(context().app).get(`${ANY_ROUTE}?fail=${value}`).expect(400);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
  });

  it('waits before authentication, so a bad token still costs the delay', async () => {
    const { res, elapsedMs } = await timed(() =>
      request(context().app)
        .get(`/api/me?delay=${String(SMALL_DELAY_MS)}`)
        .set('Authorization', 'Bearer not.a.token'),
    );
    expect(res.status).toBe(401);
    expectErrorShape(res.body, 'UNAUTHENTICATED');
    expect(elapsedMs).toBeGreaterThanOrEqual(SMALL_DELAY_MS);
  });

  it('leaves other query parameters to the route', async () => {
    await request(context().app).get(`${ANY_ROUTE}?page=2&delay=0`).expect(404);
  });
});

describe('/api/health and the simulation parameters', () => {
  const context = useTestContext();

  it('ignores delay, so the boot check measures the real server', async () => {
    const { res, elapsedMs } = await timed(() =>
      request(context().app).get('/api/health?delay=5000'),
    );
    expect(res.status).toBe(200);
    expect(elapsedMs).toBeLessThan(1000);
    expect(res.headers['server-timing']).toMatch(/^delay;dur=0,/);
  });

  it('ignores invalid values and fail=true', async () => {
    await request(context().app).get('/api/health?delay=abc').expect(200);
    await request(context().app).get('/api/health?fail=true').expect(200);
  });
});

describe('with SIMULATION_ENABLED=false', () => {
  const context = useTestContext({ env: { SIMULATION_ENABLED: 'false' } });

  it.each(['delay=0', 'fail=true'])('rejects %s with 400 SIMULATION_DISABLED', async (query) => {
    const res = await request(context().app).get(`${ANY_ROUTE}?${query}`).expect(400);
    expectErrorShape(res.body, 'SIMULATION_DISABLED');
  });

  it('serves requests that do not use the parameters', async () => {
    await request(context().app).get(ANY_ROUTE).expect(404);
    await request(context().app).get('/api/health').expect(200);
  });
});
