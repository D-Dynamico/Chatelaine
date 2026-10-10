import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectErrorShape } from '../helpers/error-shape.js';
import { DEMO_PASSWORD, signInUsers } from '../helpers/fixtures.js';
import type { Clock } from '../../src/lib/clock.js';
import { createTestContext, TEST_NOW, useTestContext } from '../helpers/test-app.js';
import { T2 } from '../helpers/fixtures.js';

const LOGIN = '/api/auth/login';
const USER_VIEW_KEYS = [
  'createdAt',
  'department',
  'displayName',
  'email',
  'lastLoginAt',
  'previousLoginAt',
  'role',
  'status',
  'updatedAt',
  'userId',
];

describe('POST /api/auth/login', () => {
  const context = useTestContext({ users: signInUsers() });
  const login = (body: object) => request(context().app).post(LOGIN).send(body);

  it.each([
    ['riya', 'GENERAL'],
    ['meera.admin', 'ADMIN'],
  ])('signs in %s with the matching role %s', async (userId, role) => {
    const res = await login({ userId, password: DEMO_PASSWORD, role }).expect(200);
    const body = res.body as { token: string; expiresAt: string; user: Record<string, unknown> };
    expect(Object.keys(body).sort()).toEqual(['expiresAt', 'token', 'user']);
    expect(Object.keys(body.user).sort()).toEqual(USER_VIEW_KEYS);
    expect(body.user).toMatchObject({
      userId,
      role,
      lastLoginAt: TEST_NOW,
      previousLoginAt: null,
    });
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.expiresAt).toBe('2026-10-07T14:00:00.000Z'); // TEST_NOW plus the 2h default
  });

  it('records the sign-in time on the stored user', async () => {
    await login({ userId: 'riya', password: DEMO_PASSWORD, role: 'GENERAL' }).expect(200);
    expect((await context().store.users.findById('riya'))?.lastLoginAt).toBe(TEST_NOW);
  });

  it('trims and lower-cases the userId before looking it up', async () => {
    await login({ userId: '  RIYA ', password: DEMO_PASSWORD, role: 'GENERAL' }).expect(200);
  });

  it('answers every kind of failure with the byte-identical 401', async () => {
    const attempts = [
      { userId: 'riya', password: 'wrong-password', role: 'GENERAL' }, // wrong password
      { userId: 'riya', password: DEMO_PASSWORD, role: 'ADMIN' }, // wrong role
      { userId: 'nobody', password: DEMO_PASSWORD, role: 'GENERAL' }, // unknown user
      { userId: 'kabir', password: DEMO_PASSWORD, role: 'GENERAL' }, // disabled
    ];
    const bodies: string[] = [];
    for (const attempt of attempts) {
      const res = await login(attempt).expect(401);
      expectErrorShape(res.body, 'INVALID_CREDENTIALS');
      bodies.push(res.text);
    }
    expect(new Set(bodies).size).toBe(1);
  });

  it('does not record a sign-in when the password is right but the account cannot sign in', async () => {
    await login({ userId: 'meera.admin', password: DEMO_PASSWORD, role: 'GENERAL' }).expect(401);
    await login({ userId: 'kabir', password: DEMO_PASSWORD, role: 'GENERAL' }).expect(401);
    const users = context().store.users;
    expect((await users.findById('meera.admin'))?.lastLoginAt).toBeNull();
    expect((await users.findById('kabir'))?.lastLoginAt).toBeNull();
  });

  it.each([
    [{ userId: 'riya', password: DEMO_PASSWORD }, 'role'],
    [{ userId: 'riya', password: DEMO_PASSWORD, role: 'SUPER' }, 'role'],
    [{ userId: 'ab', password: DEMO_PASSWORD, role: 'GENERAL' }, 'userId'],
    [{ userId: 'riya', password: '', role: 'GENERAL' }, 'password'],
    [{ userId: 'riya', password: DEMO_PASSWORD, role: 'GENERAL', admin: true }, ''],
  ])('refuses %o with 400, naming %s', async (body, path) => {
    const res = await login(body).expect(400);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
    expect(res.body).toMatchObject({ error: { details: [{ path }] } });
  });

  it('never returns a password hash', async () => {
    const res = await login({ userId: 'riya', password: DEMO_PASSWORD, role: 'GENERAL' });
    expect(res.text).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('login rate limit', () => {
  it('answers the 11th attempt in the window with 429 and Retry-After', async () => {
    const context = await createTestContext({ users: signInUsers() });
    const attempt = () => request(context.app).post(LOGIN).send({});
    for (let n = 1; n <= 10; n += 1) await attempt().expect(400);

    const limited = await attempt().expect(429);
    expectErrorShape(limited.body, 'RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    await context.cleanup();
  });

  it('starts every app with a fresh counter', async () => {
    const context = await createTestContext({ users: signInUsers() });
    await request(context.app)
      .post(LOGIN)
      .send({ userId: 'riya', password: DEMO_PASSWORD, role: 'GENERAL' })
      .expect(200);
    await context.cleanup();
  });
});

describe('POST /api/auth/login, signing in again', () => {
  let now = new Date(TEST_NOW);
  const clock: Clock = { now: () => now };
  const context = useTestContext({ users: signInUsers(), clock });
  const login = () =>
    request(context().app)
      .post(LOGIN)
      .send({ userId: 'riya', password: DEMO_PASSWORD, role: 'GENERAL' })
      .expect(200);

  it('returns the sign-in before this one as previousLoginAt, and stores it', async () => {
    now = new Date(TEST_NOW);
    const first = await login();
    expect((first.body as { user: object }).user).toMatchObject({
      lastLoginAt: TEST_NOW,
      previousLoginAt: null,
    });

    now = new Date(T2);
    const second = await login();

    expect((second.body as { user: object }).user).toMatchObject({
      lastLoginAt: T2,
      previousLoginAt: TEST_NOW,
    });
    expect(await context().store.users.findById('riya')).toMatchObject({
      lastLoginAt: T2,
      previousLoginAt: TEST_NOW,
    });
  });
});
