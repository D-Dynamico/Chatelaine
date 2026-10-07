import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../../src/domain/errors.js';
import type { NewUser } from '../../src/domain/user.js';
import { fixedClock } from '../../src/lib/clock.js';
import { FileStore } from '../../src/repositories/file/file-store.js';
import { PasswordService } from '../../src/services/password.service.js';
import { UserService } from '../../src/services/user.service.js';
import { aUser, T1 } from '../helpers/fixtures.js';

/**
 * LAST_ADMIN cannot be reached through one API request: the caller is always an active
 * admin who may not change themselves (D30). So the rule is tested here, with a caller who
 * is not in the store at all, as a script or import would be.
 */
const script = aUser({ userId: 'ops.script', role: 'ADMIN' });

describe('UserService last-admin protection', () => {
  let dir: string;
  let store: FileStore;
  let users: UserService;

  async function open(stored: NewUser[]): Promise<void> {
    for (const user of stored) await store.users.create(user);
  }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'chatelaine-users-'));
    store = new FileStore(join(dir, 'chatelaine.xml'));
    await store.init();
    users = new UserService(store.users, store.records, new PasswordService(4), fixedClock(T1));
  });
  afterEach(async () => {
    await store.close();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  const lastAdmin = aUser({ userId: 'meera.admin', role: 'ADMIN' });

  it.each([
    ['demoting', () => users.update(script, 'meera.admin', { role: 'GENERAL' })],
    ['disabling', () => users.update(script, 'meera.admin', { status: 'DISABLED' })],
    ['deleting', () => users.delete(script, 'meera.admin')],
  ])('refuses %s the last active admin with LAST_ADMIN', async (_case, act) => {
    await open([lastAdmin, aUser()]);
    const attempt = act();
    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    await expect(attempt).rejects.toMatchObject({ code: 'LAST_ADMIN' });
    expect(await store.users.findById('meera.admin')).toMatchObject({
      role: 'ADMIN',
      status: 'ACTIVE',
    });
  });

  it('does not count a disabled admin as one that remains', async () => {
    await open([lastAdmin, aUser({ userId: 'vikram.admin', role: 'ADMIN', status: 'DISABLED' })]);
    await expect(users.update(script, 'meera.admin', { role: 'GENERAL' })).rejects.toMatchObject({
      code: 'LAST_ADMIN',
    });
  });

  it('allows the change once another active admin exists', async () => {
    await open([lastAdmin, aUser({ userId: 'vikram.admin', role: 'ADMIN' })]);
    await users.update(script, 'meera.admin', { role: 'GENERAL' });
    expect((await store.users.findById('meera.admin'))?.role).toBe('GENERAL');
  });

  it('still lets the last admin’s profile be edited', async () => {
    await open([lastAdmin]);
    await users.update(script, 'meera.admin', { department: 'Security', role: 'ADMIN' });
    expect((await store.users.findById('meera.admin'))?.department).toBe('Security');
  });
});
