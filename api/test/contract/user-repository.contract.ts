import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/domain/errors.js';
import type { Store } from '../../src/repositories/contracts.js';
import { aUser, T0, T1 } from '../helpers/fixtures.js';

export interface StoreHandle {
  readonly store: Store;
  dispose(): Promise<void>;
}

/**
 * The behaviour every storage adapter must share (docs/TEST_PLAN.md §35). An adapter is
 * done when this suite passes against it, not when it compiles.
 */
export function describeUserRepositoryContract(
  adapter: string,
  openStore: () => Promise<StoreHandle>,
): void {
  describe(`UserRepository contract: ${adapter}`, () => {
    let handle: StoreHandle;
    const users = () => handle.store.users;

    beforeEach(async () => {
      handle = await openStore();
      await handle.store.init();
    });
    afterEach(async () => {
      await handle.dispose();
    });

    it('creates a user and returns it without the password hash', async () => {
      const created = await users().create(aUser());
      expect(created).not.toHaveProperty('passwordHash');
      expect(created).toMatchObject({ userId: 'riya', role: 'GENERAL', lastLoginAt: null });
      expect(await users().findById('riya')).toEqual(created);
    });

    it('refuses a duplicate userId with ConflictError and keeps the original', async () => {
      await users().create(aUser());
      const duplicate = users().create(aUser({ displayName: 'Impostor' }));
      await expect(duplicate).rejects.toBeInstanceOf(ConflictError);
      await expect(duplicate).rejects.toMatchObject({ code: 'USER_EXISTS' });
      expect((await users().findById('riya'))?.displayName).toBe('Riya Sharma');
    });

    it('returns null for an unknown user from both finders', async () => {
      expect(await users().findById('nobody')).toBeNull();
      expect(await users().findCredentials('nobody')).toBeNull();
    });

    it('returns the hash only through findCredentials', async () => {
      await users().create(aUser());
      const credentials = await users().findCredentials('riya');
      expect(credentials?.passwordHash).toBe('stored-hash-for-riya');
      expect(credentials?.user).not.toHaveProperty('passwordHash');
      expect(await users().findById('riya')).not.toHaveProperty('passwordHash');
    });

    it('updates only the patched fields', async () => {
      await users().create(aUser());
      const updated = await users().update('riya', { department: 'Audit', updatedAt: T1 });
      expect(updated).toMatchObject({ department: 'Audit', updatedAt: T1, createdAt: T0 });
      expect(updated.displayName).toBe('Riya Sharma');
      expect(await users().findById('riya')).toEqual(updated);
    });

    it('updates the password hash without exposing it', async () => {
      await users().create(aUser());
      const updated = await users().update('riya', { passwordHash: 'new-hash', updatedAt: T1 });
      expect(updated).not.toHaveProperty('passwordHash');
      expect((await users().findCredentials('riya'))?.passwordHash).toBe('new-hash');
    });

    it('deletes a user', async () => {
      await users().create(aUser());
      await users().delete('riya');
      expect(await users().findById('riya')).toBeNull();
    });

    it.each([
      ['update', (s: Store) => s.users.update('nobody', { updatedAt: T1 })],
      ['delete', (s: Store) => s.users.delete('nobody')],
      ['touchLastLogin', (s: Store) => s.users.touchLastLogin('nobody', T1)],
    ])('%s on an unknown user throws USER_NOT_FOUND', async (_name, act) => {
      const attempt = act(handle.store);
      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
      await expect(attempt).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    });

    it('records a sign-in without counting it as a profile change', async () => {
      await users().create(aUser());
      await users().touchLastLogin('riya', T1);
      expect(await users().findById('riya')).toMatchObject({ lastLoginAt: T1, updatedAt: T0 });
    });

    it('hands out copies, so changing a result cannot change the store', async () => {
      await users().create(aUser());
      const found = await users().findById('riya');
      Object.assign(found ?? {}, { role: 'ADMIN' });
      expect((await users().findById('riya'))?.role).toBe('GENERAL');
    });

    it('empties on reset', async () => {
      await users().create(aUser());
      await handle.store.reset();
      expect(await users().findById('riya')).toBeNull();
    });
  });
}
