import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { useTestContext, TEST_ORIGIN, TEST_VERSION } from '../helpers/test-app.js';

describe('GET /api/health', () => {
  const context = useTestContext();

  it('reports status, storage kind, uptime and version', async () => {
    const res = await request(context().app).get('/api/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      storage: 'file',
      uptimeSeconds: expect.any(Number) as unknown,
      version: TEST_VERSION,
    });
  });

  it('sends a request ID and a Server-Timing split', async () => {
    const res = await request(context().app).get('/api/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['server-timing']).toMatch(/^delay;dur=0, app;dur=\d+\.\d$/);
  });

  it('gives each request its own ID', async () => {
    const first = await request(context().app).get('/api/health');
    const second = await request(context().app).get('/api/health');
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  it('allows the configured origin and exposes the timing headers to it', async () => {
    const res = await request(context().app).get('/api/health').set('Origin', TEST_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    const exposed = String(res.headers['access-control-expose-headers']);
    expect(exposed).toContain('X-Request-Id');
    expect(exposed).toContain('Server-Timing');
    expect(exposed).toContain('Location');
  });

  it('does not grant CORS to an unknown origin', async () => {
    const res = await request(context().app)
      .get('/api/health')
      .set('Origin', 'https://elsewhere.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets helmet security headers', async () => {
    const res = await request(context().app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
