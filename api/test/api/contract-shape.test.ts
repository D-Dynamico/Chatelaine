import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { DEMO_PASSWORD, signInUsers } from '../helpers/fixtures.js';
import { useTestContext } from '../helpers/test-app.js';

const SECRET_KEYS = new Set(['passwordHash', 'password']);
const BCRYPT_HASH = /\$2[aby]\$\d{2}\$/;

/** Every key anywhere in a JSON value, however deeply nested. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(allKeys);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)]);
}

/**
 * Exercises every Stage 1 endpoint, on its success and failure paths, and checks each
 * response for the rules that hold everywhere (docs/TEST_PLAN.md §34, cross-cutting).
 */
describe('every Stage 1 response', () => {
  const context = useTestContext({ users: signInUsers() });

  async function collectResponses(): Promise<request.Response[]> {
    const app = context().app;
    const login = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'meera.admin', password: DEMO_PASSWORD, role: 'ADMIN' });
    const token = (login.body as { token: string }).token;
    return [
      login,
      await request(app).get('/api/health'),
      await request(app).get('/api/me').set('Authorization', `Bearer ${token}`),
      await request(app).get('/api/me'),
      await request(app)
        .post('/api/auth/login')
        .send({ userId: 'riya', password: 'nope', role: 'GENERAL' }),
      await request(app).post('/api/auth/login').send({ userId: 'riya', password: DEMO_PASSWORD }),
      await request(app).get('/api/me?fail=true'),
      await request(app).get('/api/me?delay=abc'),
      await request(app).get('/api/unknown'),
    ];
  }

  it('never contains a password or password hash, at any depth', async () => {
    for (const res of await collectResponses()) {
      expect(allKeys(res.body).filter((key) => SECRET_KEYS.has(key))).toEqual([]);
      expect(res.text).not.toMatch(BCRYPT_HASH);
    }
  });

  it('carries an X-Request-Id and a Server-Timing header', async () => {
    for (const res of await collectResponses()) {
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.headers['server-timing']).toMatch(/^delay;dur=\d+, app;dur=/);
    }
  });

  it('covers both outcomes, so the scan is not only reading successes', async () => {
    const statuses = (await collectResponses()).map((res) => res.status);
    expect(statuses).toEqual([200, 200, 200, 401, 401, 400, 503, 400, 404]);
  });
});
