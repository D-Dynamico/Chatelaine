import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileStore } from '../../src/repositories/file/file-store.js';
import { DEMO_PASSWORD, DEMO_USERS } from '../../src/seed/demo-users.js';
import { seedUsers } from '../../src/seed/seed-users.js';
import { PasswordService } from '../../src/services/password.service.js';
import { aUser } from '../helpers/fixtures.js';

// Cost 4 keeps the suite fast; the seed's real cost is covered by the exit check (§31).
const passwords = new PasswordService(4);

describe('seedUsers', () => {
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

  it('writes the six demo accounts from ARCHITECTURE §5 with their roles and statuses', async () => {
    expect(await seedUsers(store, passwords)).toBe(6);
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
    await seedUsers(store, passwords);
    for (const { userId } of DEMO_USERS) {
      const credentials = await store.users.findCredentials(userId);
      expect(await passwords.verify(DEMO_PASSWORD, credentials?.passwordHash ?? '')).toBe(true);
    }
  });

  it('is idempotent and removes anything that was there before', async () => {
    await store.users.create(aUser({ userId: 'leftover' }));
    await seedUsers(store, passwords);
    const first = await store.users.findById('riya');
    await seedUsers(store, passwords);
    expect(await store.users.findById('leftover')).toBeNull();
    expect(await store.users.findById('riya')).toEqual(first);
  });
});
