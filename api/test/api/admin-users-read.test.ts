import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectErrorShape } from '../helpers/error-shape.js';
import { aUser, DEMO_PASSWORD_HASH, requestSet, signInUsers } from '../helpers/fixtures.js';
import { bearerFor } from '../helpers/sign-in.js';
import { useTestContext } from '../helpers/test-app.js';

const USERS = '/api/admin/users';

interface UserPage {
  items: { userId: string }[];
  total: number;
}

describe('GET /api/admin/users and /api/admin/users/:userId', () => {
  const context = useTestContext({
    users: [
      ...signInUsers(),
      aUser({ userId: 'sara', displayName: 'Sara Khan', passwordHash: DEMO_PASSWORD_HASH }),
    ],
    requests: requestSet(),
  });

  async function get(path: string, userId: string, role: 'GENERAL' | 'ADMIN', status: number) {
    const app = context().app;
    const authorization = await bearerFor(app, userId, role);
    return request(app).get(path).set('Authorization', authorization).expect(status);
  }
  const asAdmin = (path: string, status = 200) => get(path, 'meera.admin', 'ADMIN', status);
  const asGeneral = (path: string, status: number) => get(path, 'riya', 'GENERAL', status);

  describe('refuse a General User with 403, before looking at the input', () => {
    it.each([USERS, `${USERS}?pageSize=999&sort=nonsense`, `${USERS}/riya`, `${USERS}/NOT VALID`])(
      'GET %s',
      async (path) => {
        expectErrorShape((await asGeneral(path, 403)).body, 'FORBIDDEN');
      },
    );
  });

  it('refuses an anonymous caller with 401', async () => {
    const res = await request(context().app).get(USERS).expect(401);
    expectErrorShape(res.body, 'UNAUTHENTICATED');
  });

  it('lists users by userId by default, without hashes', async () => {
    const res = await asAdmin(USERS);
    const body = res.body as UserPage;
    expect(body.items.map((user) => user.userId)).toEqual(['kabir', 'meera.admin', 'riya', 'sara']);
    expect(res.text).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('filters, searches and pages', async () => {
    const ids = async (query: string) =>
      ((await asAdmin(`${USERS}?${query}`)).body as UserPage).items.map((user) => user.userId);
    expect(await ids('role=ADMIN')).toEqual(['meera.admin']);
    expect(await ids('status=DISABLED')).toEqual(['kabir']);
    expect(await ids('q=khan')).toEqual(['sara']);
    expect(await ids('sort=displayName&order=desc')).toEqual([
      'sara',
      'riya',
      'meera.admin',
      'kabir',
    ]);
    const page = (await asAdmin(`${USERS}?page=2&pageSize=3`)).body as UserPage;
    expect(page.items.map((user) => user.userId)).toEqual(['sara']);
    expect(page.total).toBe(4);
  });

  it('returns one user with the number of requests a delete would remove', async () => {
    const riya = await asAdmin(`${USERS}/riya`);
    expect(riya.body).toMatchObject({ userId: 'riya', displayName: 'Riya Sharma', recordCount: 4 });
    expect(riya.body).not.toHaveProperty('passwordHash');
    expect((await asAdmin(`${USERS}/sara`)).body).toMatchObject({ recordCount: 0 });
  });

  it('answers 404 USER_NOT_FOUND for a user that does not exist', async () => {
    expectErrorShape((await asAdmin(`${USERS}/nobody`, 404)).body, 'USER_NOT_FOUND');
  });

  it.each(['page=0', 'sort=email', 'role=OWNER'])('refuses %s with 400', async (query) => {
    expectErrorShape((await asAdmin(`${USERS}?${query}`, 400)).body, 'VALIDATION_FAILED');
  });

  it('refuses a malformed userId with 400', async () => {
    expectErrorShape((await asAdmin(`${USERS}/Not%20Valid`, 400)).body, 'VALIDATION_FAILED');
  });
});
