import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServiceRequest } from '../../src/domain/service-request.js';
import { FileStore } from '../../src/repositories/file/file-store.js';
import { DEMO_ANCHOR, generateDemoRequests } from '../../src/seed/demo-requests.js';
import { DEMO_PASSWORD, DEMO_USERS } from '../../src/seed/demo-users.js';
import { seedDemoData } from '../../src/seed/seed-demo-data.js';
import { PasswordService } from '../../src/services/password.service.js';
import { aUser } from '../helpers/fixtures.js';

// Cost 4 keeps the suite fast; the seed's real cost is covered by the exit check (§31).
const passwords = new PasswordService(4);
const ALL = { sort: 'createdAt', order: 'asc', page: 1, pageSize: 50 } as const;

function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
}

describe('generateDemoRequests', () => {
  const requests: ServiceRequest[] = generateDemoRequests();

  it('produces the same requests on every call', () => {
    expect(generateDemoRequests()).toEqual(requests);
    expect(generateDemoRequests(7)).not.toEqual(requests);
  });

  it('spreads 60 requests as ARCHITECTURE §5 describes, none for sara', () => {
    expect(requests).toHaveLength(60);
    expect(countBy(requests, (r) => r.ownerId)).toEqual({
      riya: 22,
      arjun: 7,
      'meera.admin': 10,
      'vikram.admin': 10,
      kabir: 11,
    });
  });

  it('makes about one in five Admin-level, including some of Riya’s', () => {
    const adminLevel = requests.filter((r) => r.accessLevel === 'ADMIN');
    expect(adminLevel).toHaveLength(12);
    expect(adminLevel.filter((r) => r.ownerId === 'riya')).toHaveLength(5);
    expect(adminLevel.every((r) => r.internalNote !== null)).toBe(true);
  });

  it('numbers requests from SR-1001 in the order they were raised', () => {
    expect(requests.map((r) => r.id)).toEqual(
      Array.from({ length: 60 }, (_, n) => `SR-${String(1001 + n)}`),
    );
    const raised = requests.map((r) => r.createdAt);
    expect(raised).toEqual([...raised].sort());
  });

  it('keeps every timestamp in order and before the demo anchor', () => {
    for (const r of requests) {
      expect(r.updatedAt >= r.createdAt).toBe(true);
      expect(r.updatedAt < DEMO_ANCHOR).toBe(true);
    }
  });

  it('never gives one person the same request title twice', () => {
    for (const owner of new Set(requests.map((r) => r.ownerId))) {
      const titles = requests.filter((r) => r.ownerId === owner).map((r) => r.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});

describe('seedDemoData', () => {
  let dir: string;
  let store: FileStore;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'chatelaine-seed-'));
    store = new FileStore(join(dir, 'chatelaine.xml'));
    await store.init();
  });
  afterEach(async () => {
    await store.close();
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the six demo accounts with their roles and statuses', async () => {
    expect(await seedDemoData(store, passwords)).toEqual({ users: 6, requests: 60 });
    const summary = await Promise.all(
      DEMO_USERS.map(async ({ userId }) => {
        const user = await store.users.findById(userId);
        return `${String(user?.userId)} ${String(user?.role)} ${String(user?.status)}`;
      }),
    );
    expect(summary).toEqual([
      'meera.admin ADMIN ACTIVE',
      'vikram.admin ADMIN ACTIVE',
      'riya GENERAL ACTIVE',
      'arjun GENERAL ACTIVE',
      'sara GENERAL ACTIVE',
      'kabir GENERAL DISABLED',
    ]);
  });

  it('gives every account the demo password', async () => {
    await seedDemoData(store, passwords);
    for (const { userId } of DEMO_USERS) {
      const credentials = await store.users.findCredentials(userId);
      expect(await passwords.verify(DEMO_PASSWORD, credentials?.passwordHash ?? '')).toBe(true);
    }
  });

  it('is idempotent and removes anything that was there before', async () => {
    await store.users.create(aUser({ userId: 'leftover' }));
    await seedDemoData(store, passwords);
    const first = await store.records.list({}, ALL);
    await seedDemoData(store, passwords);
    expect(await store.users.findById('leftover')).toBeNull();
    expect(await store.records.list({}, ALL)).toEqual(first);
    expect(first.total).toBe(60);
  });
});
