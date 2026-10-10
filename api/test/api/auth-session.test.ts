import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { fixedClock } from '../../src/lib/clock.js';
import { TokenService } from '../../src/services/token.service.js';
import { expectErrorShape } from '../helpers/error-shape.js';
import { DEMO_PASSWORD, signInUsers, T0, T1 } from '../helpers/fixtures.js';
import { useTestContext } from '../helpers/test-app.js';

const ME = '/api/me';
const THREE_HOURS_BEFORE_T1 = '2026-10-07T09:00:00.000Z';

describe('GET /api/me and session checks', () => {
  const context = useTestContext({ users: signInUsers() });

  async function signIn(userId = 'riya', role = 'GENERAL'): Promise<string> {
    const res = await request(context().app)
      .post('/api/auth/login')
      .send({ userId, password: DEMO_PASSWORD, role })
      .expect(200);
    return (res.body as { token: string }).token;
  }

  const me = (authorization?: string) => {
    const req = request(context().app).get(ME);
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };

  it('returns the signed-in user for the token login issued', async () => {
    const res = await me(`Bearer ${await signIn()}`).expect(200);
    expect(res.body).toEqual({
      userId: 'riya',
      displayName: 'Riya Sharma',
      email: 'riya@chatelaine.test',
      department: 'Finance',
      role: 'GENERAL',
      status: 'ACTIVE',
      createdAt: T0,
      updatedAt: T0,
      lastLoginAt: T1,
      previousLoginAt: null,
    });
  });

  describe('refuses with 401 UNAUTHENTICATED', () => {
    const otherSecret = new TokenService(
      { secret: 'some-other-secret-that-is-long-enough', ttlSeconds: 7200 },
      fixedClock(T1),
    );

    it.each([
      ['no Authorization header', undefined],
      ['an empty bearer', 'Bearer '],
      ['another scheme', 'Basic cml5YTpwYXNzd29yZA=='],
      ['a malformed token', 'Bearer not-a-jwt'],
      [
        'a token signed with another secret',
        () => otherSecret.issue({ sub: 'riya', role: 'GENERAL' }).token,
      ],
    ])('for %s', async (_case, value) => {
      const header = typeof value === 'function' ? `Bearer ${value()}` : value;
      expectErrorShape((await me(header).expect(401)).body, 'UNAUTHENTICATED');
    });

    it('for an expired token', async () => {
      const issuedEarlier = new TokenService(
        { ...context().config.jwt, ttlSeconds: 7200 },
        fixedClock(THREE_HOURS_BEFORE_T1),
      );
      const { token } = issuedEarlier.issue({ sub: 'riya', role: 'GENERAL' });
      expectErrorShape((await me(`Bearer ${token}`).expect(401)).body, 'UNAUTHENTICATED');
    });

    it('for an unsigned token with alg "none"', async () => {
      const unsigned = jwt.sign({ sub: 'meera.admin', role: 'ADMIN' }, null, { algorithm: 'none' });
      // An alg-none token has an empty signature segment; append one character so it still
      // has the three-part shape and reaches the verifier rather than the header check.
      expectErrorShape((await me(`Bearer ${unsigned}x`).expect(401)).body, 'UNAUTHENTICATED');
    });

    it('for a correctly signed token without a valid role claim', async () => {
      const token = jwt.sign({ sub: 'riya', role: 'ROOT' }, context().config.jwt.secret, {
        algorithm: 'HS256',
      });
      expectErrorShape((await me(`Bearer ${token}`).expect(401)).body, 'UNAUTHENTICATED');
    });
  });

  describe('refuses a valid token with 401 SESSION_INVALID once the user changed', () => {
    it('when the user was disabled', async () => {
      const token = await signIn();
      await context().store.users.update('riya', { status: 'DISABLED', updatedAt: T1 });
      expectErrorShape((await me(`Bearer ${token}`).expect(401)).body, 'SESSION_INVALID');
    });

    it('when the user was deleted', async () => {
      const token = await signIn();
      await context().store.users.delete('riya');
      expectErrorShape((await me(`Bearer ${token}`).expect(401)).body, 'SESSION_INVALID');
    });

    it('when the user was given another role', async () => {
      const token = await signIn('meera.admin', 'ADMIN');
      await context().store.users.update('meera.admin', { role: 'GENERAL', updatedAt: T1 });
      expectErrorShape((await me(`Bearer ${token}`).expect(401)).body, 'SESSION_INVALID');
    });
  });
});
