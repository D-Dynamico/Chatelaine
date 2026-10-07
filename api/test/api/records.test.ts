import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { expectErrorShape } from '../helpers/error-shape.js';
import { aUser, DEMO_PASSWORD_HASH, requestSet, signInUsers } from '../helpers/fixtures.js';
import { bearerFor } from '../helpers/sign-in.js';
import { useTestContext } from '../helpers/test-app.js';

const RESTRICTED_KEYS = ['ownerId', 'ownerName', 'assignee', 'internalNote'];
const GENERAL_KEYS = [
  'accessLevel',
  'category',
  'createdAt',
  'id',
  'priority',
  'status',
  'title',
  'updatedAt',
];
const ALL_ASC = 'sort=createdAt&order=asc&pageSize=50';

interface ListBody {
  items: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
}

describe('GET /api/records and /api/records/summary', () => {
  const context = useTestContext({
    users: [
      ...signInUsers(),
      aUser({ userId: 'arjun', displayName: 'Arjun Rao', passwordHash: DEMO_PASSWORD_HASH }),
    ],
    requests: requestSet(),
  });

  /** Signs in, then makes the request and asserts its status before returning it. */
  async function get(path: string, userId: string, role: 'GENERAL' | 'ADMIN', status: number) {
    const app = context().app;
    const authorization = await bearerFor(app, userId, role);
    return request(app).get(path).set('Authorization', authorization).expect(status);
  }
  const asRiya = (path: string, status = 200) => get(path, 'riya', 'GENERAL', status);
  const asAdmin = (path: string, status = 200) => get(path, 'meera.admin', 'ADMIN', status);
  const idsOf = (body: unknown) => (body as ListBody).items.map((item) => item.id);

  describe('for a General User', () => {
    it('lists only their own requests, and only at General level', async () => {
      // requestSet: Riya also owns SR-1002 (Admin-level); SR-1004..1006 and 1008 are others'.
      const res = await asRiya(`/api/records?${ALL_ASC}`);
      expect(idsOf(res.body)).toEqual(['SR-1001', 'SR-1003', 'SR-1007']);
      expect((res.body as ListBody).total).toBe(3);
    });

    it('never sends restricted keys, not even as null', async () => {
      const res = await asRiya(`/api/records?${ALL_ASC}`);
      for (const item of (res.body as ListBody).items) {
        for (const key of RESTRICTED_KEYS) expect(item).not.toHaveProperty(key);
        expect(Object.keys(item).sort()).toEqual(GENERAL_KEYS);
      }
    });

    it.each(['ADMIN', 'GENERAL'])('refuses accessLevel=%s with 403', async (level) => {
      const res = await asRiya(`/api/records?accessLevel=${level}`, 403);
      expectErrorShape(res.body, 'FORBIDDEN');
    });

    it('gets a summary of exactly what the list shows, with no ADMIN key', async () => {
      const res = await asRiya('/api/records/summary');
      expect(res.body).toEqual({
        scope: 'OWN',
        total: 3,
        byStatus: { OPEN: 1, IN_PROGRESS: 1, RESOLVED: 0, CLOSED: 1 },
        byPriority: { LOW: 1, MEDIUM: 1, HIGH: 1, CRITICAL: 0 },
        byAccessLevel: { GENERAL: 3 },
      });
    });
  });

  describe('for an Admin', () => {
    it('lists every request with every field and the owner’s name', async () => {
      const res = await asAdmin(`/api/records?${ALL_ASC}`);
      const body = res.body as ListBody;
      expect(body.total).toBe(8);
      expect(body.items.find((item) => item.id === 'SR-1002')).toMatchObject({
        ownerId: 'riya',
        ownerName: 'Riya Sharma',
        accessLevel: 'ADMIN',
        internalNote: 'Possible phishing; keep private',
      });
      expect(body.items.find((item) => item.id === 'SR-1004')).toMatchObject({
        ownerName: 'Arjun Rao',
      });
    });

    it('can filter by access level', async () => {
      const res = await asAdmin('/api/records?accessLevel=ADMIN&sort=createdAt&order=asc');
      expect(idsOf(res.body)).toEqual(['SR-1002', 'SR-1005']);
    });

    it('gets a summary over everything, both access levels included', async () => {
      const res = await asAdmin('/api/records/summary');
      expect(res.body).toMatchObject({
        scope: 'ALL',
        total: 8,
        byAccessLevel: { GENERAL: 6, ADMIN: 2 },
      });
    });
  });

  describe('query handling', () => {
    it('defaults to newest first, ten per page', async () => {
      const res = await asAdmin('/api/records');
      expect(res.body).toMatchObject({ page: 1, pageSize: 10, total: 8 });
      expect(idsOf(res.body)[0]).toBe('SR-1007');
    });

    it('pages with a correct total and a partial last page', async () => {
      const res = await asAdmin('/api/records?page=3&pageSize=3&sort=createdAt&order=asc');
      expect(res.body).toMatchObject({ page: 3, pageSize: 3, total: 8 });
      expect(idsOf(res.body)).toEqual(['SR-1006', 'SR-1007']);
    });

    it('sorts priority by severity, CRITICAL first in descending order', async () => {
      const res = await asAdmin('/api/records?sort=priority&order=desc');
      expect((res.body as ListBody).items.slice(0, 2).map((item) => item.priority)).toEqual([
        'CRITICAL',
        'CRITICAL',
      ]);
    });

    it('combines status, priority and text filters', async () => {
      expect(idsOf((await asAdmin('/api/records?status=OPEN&q=laptop')).body)).toEqual(['SR-1007']);
      expect(idsOf((await asAdmin('/api/records?status=OPEN&priority=HIGH')).body)).toEqual([
        'SR-1005',
      ]);
    });

    it.each([
      ['pageSize=51', 'pageSize'],
      ['page=0', 'page'],
      ['sort=owner', 'sort'],
      ['order=up', 'order'],
      ['status=DONE', 'status'],
      ['q=', 'q'],
      ['status=OPEN&status=CLOSED', 'status'],
    ])('refuses %s with 400 naming %s', async (query, path) => {
      const res = await asAdmin(`/api/records?${query}`, 400);
      expectErrorShape(res.body, 'VALIDATION_FAILED');
      expect(res.body).toMatchObject({ error: { details: [{ path }] } });
    });

    it('asks for a session before looking at the query', async () => {
      const res = await request(context().app).get('/api/records?pageSize=999').expect(401);
      expectErrorShape(res.body, 'UNAUTHENTICATED');
      await request(context().app).get('/api/records/summary').expect(401);
    });
  });
});
