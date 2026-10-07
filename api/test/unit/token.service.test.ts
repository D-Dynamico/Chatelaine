import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { UnauthenticatedError } from '../../src/domain/errors.js';
import { fixedClock } from '../../src/lib/clock.js';
import { TokenService } from '../../src/services/token.service.js';

const SECRET = 'unit-test-secret-long-enough-for-hs256';
const NOW = '2026-10-07T12:00:00.000Z';
const NOW_SECONDS = Date.parse(NOW) / 1000;

describe('TokenService.issue', () => {
  const tokens = new TokenService({ secret: SECRET, ttlSeconds: 7200 }, fixedClock(NOW));

  it('signs the subject and role with HS256, timed by the injected clock', () => {
    const { token } = tokens.issue({ sub: 'riya', role: 'GENERAL' });
    const decoded = jwt.verify(token, SECRET, {
      algorithms: ['HS256'],
      clockTimestamp: NOW_SECONDS,
    });
    expect(decoded).toEqual({
      sub: 'riya',
      role: 'GENERAL',
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 7200,
    });
  });

  it('reports the expiry as an ISO timestamp matching the token', () => {
    expect(tokens.issue({ sub: 'riya', role: 'GENERAL' }).expiresAt).toBe(
      '2026-10-07T14:00:00.000Z',
    );
  });

  it('cannot be verified with another secret', () => {
    const { token } = tokens.issue({ sub: 'riya', role: 'ADMIN' });
    expect(() => jwt.verify(token, 'a-different-secret', { algorithms: ['HS256'] })).toThrow();
  });
});

describe('TokenService.verify', () => {
  const settings = { secret: SECRET, ttlSeconds: 7200 };
  const issuedNow = new TokenService(settings, fixedClock(NOW)).issue({
    sub: 'riya',
    role: 'GENERAL',
  }).token;

  it('returns the claims of a token it issued', () => {
    const tokens = new TokenService(settings, fixedClock(NOW));
    expect(tokens.verify(issuedNow)).toEqual({ sub: 'riya', role: 'GENERAL' });
  });

  it('accepts the token until its expiry and refuses it from then on', () => {
    const justBefore = new TokenService(settings, fixedClock('2026-10-07T13:59:59.000Z'));
    const atExpiry = new TokenService(settings, fixedClock('2026-10-07T14:00:00.000Z'));
    expect(justBefore.verify(issuedNow).sub).toBe('riya');
    expect(() => atExpiry.verify(issuedNow)).toThrow(UnauthenticatedError);
  });

  it('refuses a token signed with another algorithm', () => {
    const hs512 = jwt.sign({ sub: 'riya', role: 'GENERAL' }, SECRET, { algorithm: 'HS512' });
    expect(() => new TokenService(settings, fixedClock(NOW)).verify(hs512)).toThrow(
      UnauthenticatedError,
    );
  });
});
