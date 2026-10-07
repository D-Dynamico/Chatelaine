import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RecordListQuery } from '../../src/domain/service-request.js';
import { requestSet } from '../helpers/fixtures.js';
import type { StoreHandle } from './user-repository.contract.js';

const REQUEST_KEYS = [
  'accessLevel',
  'assignee',
  'category',
  'createdAt',
  'id',
  'internalNote',
  'ownerId',
  'priority',
  'status',
  'title',
  'updatedAt',
];

function query(overrides: Partial<RecordListQuery> = {}): RecordListQuery {
  return { sort: 'createdAt', order: 'asc', page: 1, pageSize: 50, ...overrides };
}

const RIYA_GENERAL = { ownerId: 'riya', accessLevel: 'GENERAL' } as const;

/** The behaviour every adapter must share for service requests (docs/TEST_PLAN.md §35). */
export function describeRecordRepositoryContract(
  adapter: string,
  openStore: () => Promise<StoreHandle>,
): void {
  describe(`RecordRepository contract: ${adapter}`, () => {
    let handle: StoreHandle;
    const records = () => handle.store.records;
    const ids = async (scope: object, overrides: Partial<RecordListQuery> = {}) =>
      (await records().list(scope, query(overrides))).items.map((item) => item.id);

    beforeEach(async () => {
      handle = await openStore();
      await handle.store.init();
      await records().insertMany(requestSet());
    });
    afterEach(async () => {
      await handle.dispose();
    });

    it('scopes by owner, and by owner and access level together', async () => {
      expect(await ids({ ownerId: 'riya' })).toEqual(['SR-1001', 'SR-1002', 'SR-1003', 'SR-1007']);
      expect(await ids(RIYA_GENERAL)).toEqual(['SR-1001', 'SR-1003', 'SR-1007']);
      expect((await records().list({}, query())).total).toBe(8);
    });

    it('lets filters narrow the scope but never widen it', async () => {
      expect(await ids({}, { accessLevel: 'ADMIN' })).toEqual(['SR-1002', 'SR-1005']);
      expect(await ids(RIYA_GENERAL, { accessLevel: 'ADMIN' })).toEqual([]);
    });

    it('combines status and priority filters', async () => {
      expect(await ids({}, { status: 'OPEN', priority: 'CRITICAL' })).toEqual([
        'SR-1002',
        'SR-1006',
      ]);
    });

    it('searches id and title case-insensitively, treating the text literally', async () => {
      expect(await ids({}, { q: 'LAPTOP' })).toEqual(['SR-1001', 'SR-1007']);
      expect(await ids({}, { q: 'sr-1004' })).toEqual(['SR-1004']);
      expect(await ids({}, { q: 'reader (east' })).toEqual(['SR-1006']);
      expect(await ids({}, { q: '.*' })).toEqual([]);
    });

    it('sorts priority by severity, breaking ties by id in the same direction', async () => {
      expect(await ids({}, { sort: 'priority', order: 'desc' })).toEqual([
        'SR-1006',
        'SR-1002',
        'SR-1008',
        'SR-1005',
        'SR-1001',
        'SR-1007',
        'SR-1004',
        'SR-1003',
      ]);
    });

    it('sorts status in workflow order', async () => {
      expect(await ids({}, { sort: 'status' })).toEqual([
        'SR-1002',
        'SR-1005',
        'SR-1006',
        'SR-1007',
        'SR-1001',
        'SR-1004',
        'SR-1003',
        'SR-1008',
      ]);
    });

    it('sorts titles by code unit, so upper case comes before lower case', async () => {
      expect(await ids({}, { sort: 'title' })).toEqual([
        'SR-1005',
        'SR-1001',
        'SR-1007',
        'SR-1008',
        'SR-1006',
        'SR-1002',
        'SR-1004',
        'SR-1003',
      ]);
    });

    it('sorts by date with a stable tie-break', async () => {
      expect((await ids({}, { sort: 'createdAt' })).slice(0, 2)).toEqual(['SR-1001', 'SR-1008']);
      expect((await ids({}, { sort: 'updatedAt', order: 'desc' })).slice(0, 3)).toEqual([
        'SR-1003',
        'SR-1006',
        'SR-1007',
      ]);
    });

    it('pages with a total, including a partial last page and an empty one past it', async () => {
      const third = await records().list({}, query({ page: 3, pageSize: 3 }));
      expect(third).toMatchObject({ page: 3, pageSize: 3, total: 8 });
      expect(third.items.map((item) => item.id)).toEqual(['SR-1006', 'SR-1007']);
      const beyond = await records().list({}, query({ page: 4, pageSize: 3 }));
      expect(beyond).toMatchObject({ items: [], total: 8 });
    });

    it('returns requests in the domain shape, with nulls kept', async () => {
      const [first] = (await records().list({}, query({ q: 'SR-1003' }))).items;
      expect(Object.keys(first ?? {}).sort()).toEqual(REQUEST_KEYS);
      expect(first).toMatchObject({ assignee: null, internalNote: null });
      const [secret] = (await records().list({}, query({ q: 'SR-1002' }))).items;
      expect(secret?.internalNote).toBe('Possible phishing; keep private');
    });

    it('summarises the scope with every value present', async () => {
      expect(await records().summary({})).toEqual({
        total: 8,
        byStatus: { OPEN: 4, IN_PROGRESS: 1, RESOLVED: 1, CLOSED: 2 },
        byPriority: { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 2 },
        byAccessLevel: { GENERAL: 6, ADMIN: 2 },
      });
      expect(await records().summary(RIYA_GENERAL)).toMatchObject({
        total: 3,
        byAccessLevel: { GENERAL: 3, ADMIN: 0 },
      });
    });

    it('counts and deletes by owner, leaving other owners alone', async () => {
      expect(await records().countByOwner('riya')).toBe(4);
      expect(await records().countByOwner('sara')).toBe(0);
      expect(await records().deleteByOwner('riya')).toBe(4);
      expect(await records().deleteByOwner('riya')).toBe(0);
      expect((await records().list({}, query())).total).toBe(4);
    });

    it('empties on reset', async () => {
      await handle.store.reset();
      expect((await records().list({}, query())).total).toBe(0);
    });
  });
}
