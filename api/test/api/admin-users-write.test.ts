import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectErrorShape } from '../helpers/error-shape.js';
import { aUser, DEMO_PASSWORD_HASH, requestSet, signInUsers } from '../helpers/fixtures.js';
import { bearerFor } from '../helpers/sign-in.js';
import { TEST_NOW, useTestContext } from '../helpers/test-app.js';

const USERS = '/api/admin/users';

/** Every path named in a validation error; one body can report several problems. */
const issuePaths = (body: unknown) =>
  (body as { error: { details: { path: string }[] } }).error.details.map((issue) => issue.path);
const NEHA = {
  userId: 'neha',
  displayName: 'Neha Iyer',
  email: 'neha@chatelaine.test',
  department: 'Design',
  role: 'GENERAL',
  password: 'Welcome2026',
};

describe('POST, PATCH and DELETE /api/admin/users', () => {
  const context = useTestContext({
    users: [
      ...signInUsers(),
      aUser({
        userId: 'vikram.admin',
        displayName: 'Vikram Menon',
        role: 'ADMIN',
        passwordHash: DEMO_PASSWORD_HASH,
      }),
      aUser({ userId: 'arjun', displayName: 'Arjun Rao', passwordHash: DEMO_PASSWORD_HASH }),
    ],
    requests: requestSet(),
  });

  type Method = 'post' | 'patch' | 'delete';
  async function call(
    method: Method,
    path: string,
    body: object | undefined,
    status: number,
    as = 'meera.admin',
    role: 'ADMIN' | 'GENERAL' = 'ADMIN',
  ) {
    const app = context().app;
    const authorization = await bearerFor(app, as, role);
    const req = request(app)[method](path).set('Authorization', authorization);
    return (body === undefined ? req : req.send(body)).expect(status);
  }

  describe('refuse a General User with 403, whatever the body', () => {
    it.each<[Method, string]>([
      ['post', USERS],
      ['patch', `${USERS}/arjun`],
      ['delete', `${USERS}/arjun`],
    ])('%s %s', async (method, path) => {
      const res = await call(method, path, { not: 'valid' }, 403, 'riya', 'GENERAL');
      expectErrorShape(res.body, 'FORBIDDEN');
    });
  });

  describe('create', () => {
    it('answers 201 with the new user and a Location to fetch it', async () => {
      const res = await call('post', USERS, NEHA, 201);
      expect(res.headers.location).toBe('/api/admin/users/neha');
      expect(res.body).toEqual({
        userId: 'neha',
        displayName: 'Neha Iyer',
        email: 'neha@chatelaine.test',
        department: 'Design',
        role: 'GENERAL',
        status: 'ACTIVE',
        createdAt: TEST_NOW,
        updatedAt: TEST_NOW,
        lastLoginAt: null,
        previousLoginAt: null,
      });
      await request(context().app)
        .get('/api/admin/users/neha')
        .set('Authorization', await bearerFor(context().app, 'meera.admin', 'ADMIN'))
        .expect(200);
    });

    it('creates a user who can sign in with the password and role given', async () => {
      await call('post', USERS, { ...NEHA, userId: '  NEHA ' }, 201);
      await request(context().app)
        .post('/api/auth/login')
        .send({ userId: 'neha', password: NEHA.password, role: 'GENERAL' })
        .expect(200);
    });

    it('refuses a taken userId with 409 USER_EXISTS', async () => {
      const res = await call('post', USERS, { ...NEHA, userId: 'riya' }, 409);
      expectErrorShape(res.body, 'USER_EXISTS');
    });

    it.each([
      [{ ...NEHA, password: 'short1' }, 'password'],
      [{ ...NEHA, password: 'no-digits-here' }, 'password'],
      [{ ...NEHA, password: '1234567890' }, 'password'],
      [{ ...NEHA, email: 'not-an-email' }, 'email'],
      [{ ...NEHA, displayName: '   ' }, 'displayName'],
      [{ ...NEHA, role: 'OWNER' }, 'role'],
      [{ ...NEHA, status: 'ACTIVE' }, ''],
    ])('refuses %o with 400, naming %s', async (body, path) => {
      const res = await call('post', USERS, body, 400);
      expectErrorShape(res.body, 'VALIDATION_FAILED');
      expect(issuePaths(res.body)).toContain(path);
    });
  });

  describe('edit', () => {
    it('changes only the fields sent and stamps updatedAt', async () => {
      const res = await call('patch', `${USERS}/arjun`, { department: 'Logistics' }, 200);
      expect(res.body).toMatchObject({
        userId: 'arjun',
        displayName: 'Arjun Rao',
        department: 'Logistics',
        updatedAt: TEST_NOW,
      });
    });

    it('sets a new password that works at the next sign-in', async () => {
      await call('patch', `${USERS}/arjun`, { password: 'NewPass2026' }, 200);
      const login = (password: string) =>
        request(context().app)
          .post('/api/auth/login')
          .send({ userId: 'arjun', password, role: 'GENERAL' });
      await login('NewPass2026').expect(200);
      await login('Chatelaine@2026').expect(401);
    });

    it('ends a disabled user’s session on their next request', async () => {
      const riyaToken = await bearerFor(context().app, 'riya', 'GENERAL');
      await call('patch', `${USERS}/riya`, { status: 'DISABLED' }, 200);
      const res = await request(context().app)
        .get('/api/me')
        .set('Authorization', riyaToken)
        .expect(401);
      expectErrorShape(res.body, 'SESSION_INVALID');
    });

    it('lets one admin demote another while another active admin remains', async () => {
      const res = await call('patch', `${USERS}/vikram.admin`, { role: 'GENERAL' }, 200);
      expect(res.body).toMatchObject({ role: 'GENERAL' });
    });

    it.each([
      [{}, ''],
      [{ userId: 'arjun2' }, ''],
      [{ status: 'GONE' }, 'status'],
    ])('refuses %o with 400', async (body, path) => {
      const res = await call('patch', `${USERS}/arjun`, body, 400);
      expectErrorShape(res.body, 'VALIDATION_FAILED');
      expect(issuePaths(res.body)).toContain(path);
    });

    it('answers 404 for a user that does not exist', async () => {
      expectErrorShape(
        (await call('patch', `${USERS}/nobody`, { department: 'X' }, 404)).body,
        'USER_NOT_FOUND',
      );
    });
  });

  describe('protect admins from acting on themselves', () => {
    it.each([{ role: 'GENERAL' }, { status: 'DISABLED' }])(
      'refuses %o on their own account with 409 SELF_ACTION',
      async (change) => {
        const res = await call('patch', `${USERS}/meera.admin`, change, 409);
        expectErrorShape(res.body, 'SELF_ACTION');
      },
    );

    it('allows their own profile changes, and resending their current role', async () => {
      await call(
        'patch',
        `${USERS}/meera.admin`,
        { displayName: 'Meera N.', role: 'ADMIN', status: 'ACTIVE' },
        200,
      );
    });

    it('refuses deleting their own account with 409 SELF_ACTION', async () => {
      expectErrorShape(
        (await call('delete', `${USERS}/meera.admin`, undefined, 409)).body,
        'SELF_ACTION',
      );
    });
  });

  describe('delete', () => {
    it('removes the user and their requests, and leaves other users’ requests', async () => {
      const records = context().store.records;
      expect(await records.countByOwner('riya')).toBe(4);
      const res = await call('delete', `${USERS}/riya`, undefined, 204);
      expect(res.text).toBe('');
      expect(await context().store.users.findById('riya')).toBeNull();
      expect(await records.countByOwner('riya')).toBe(0);
      expect(await records.countByOwner('arjun')).toBe(2);
    });

    it('answers 404 for a user that does not exist', async () => {
      expectErrorShape(
        (await call('delete', `${USERS}/nobody`, undefined, 404)).body,
        'USER_NOT_FOUND',
      );
    });
  });
});
