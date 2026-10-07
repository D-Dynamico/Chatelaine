import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileStore } from '../../src/repositories/file/file-store.js';
import { aUser, requestSet, T1 } from '../helpers/fixtures.js';
import { describeRecordRepositoryContract } from './record-repository.contract.js';
import { describeUserRepositoryContract, type StoreHandle } from './user-repository.contract.js';

async function tempDataFile(): Promise<{ path: string; dir: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'chatelaine-'));
  return { dir, path: join(dir, 'nested', 'chatelaine.xml') };
}

async function openFileStore(): Promise<StoreHandle> {
  const { dir, path } = await tempDataFile();
  const store = new FileStore(path);
  return {
    store,
    dispose: async () => {
      await store.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

describeUserRepositoryContract('file (XML)', openFileStore);
describeRecordRepositoryContract('file (XML)', openFileStore);

describe('FileStore on disk', () => {
  let dir: string;
  let path: string;

  beforeEach(async () => {
    ({ dir, path } = await tempDataFile());
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function reopen(): Promise<FileStore> {
    const store = new FileStore(path);
    await store.init();
    return store;
  }

  it('creates the folder and an empty document on first init', async () => {
    await (await reopen()).close();
    expect(await readFile(path, 'utf8')).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });

  it('keeps data across a restart, exactly as written', async () => {
    const first = await reopen();
    const tricky = aUser({
      userId: '007',
      displayName: `  Tom & "Jerry" <it> 'x'  `,
      lastLoginAt: T1,
    });
    await first.users.create(tricky);
    await first.close();

    const second = await reopen();
    const credentials = await second.users.findCredentials('007');
    expect(credentials?.user.displayName).toBe(tricky.displayName);
    expect(credentials?.user.lastLoginAt).toBe(T1);
    expect(credentials?.passwordHash).toBe(tricky.passwordHash);
  });

  it('serialises concurrent writes so none are lost', async () => {
    const store = await reopen();
    await Promise.all(
      Array.from({ length: 25 }, (_, n) =>
        store.users.create(aUser({ userId: `user-${String(n)}` })),
      ),
    );
    await store.close();

    const reopened = await reopen();
    const found = await Promise.all(
      Array.from({ length: 25 }, (_, n) => reopened.users.findById(`user-${String(n)}`)),
    );
    expect(found.every((user) => user !== null)).toBe(true);
  });

  it('leaves no temp file behind after writing', async () => {
    const store = await reopen();
    await store.users.create(aUser());
    await store.close();
    expect(await readdir(join(dir, 'nested'))).toEqual(['chatelaine.xml']);
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  it('rejects a value XML cannot store, and keeps memory in step with disk', async () => {
    const store = await reopen();
    await expect(store.users.create(aUser({ displayName: 'Bell\u0007' }))).rejects.toThrow(
      /control character/,
    );
    expect(await store.users.findById('riya')).toBeNull();
    await store.close();
  });

  it('writes a readable, indented document', async () => {
    const store = await reopen();
    await store.users.create(aUser());
    await store.close();
    const xml = await readFile(path, 'utf8');
    expect(xml).toContain('\n  <users>\n    <user>\n      <userId>riya</userId>\n');
    expect(xml).not.toContain('<lastLoginAt>');
  });

  it('keeps service requests across a restart, nulls included', async () => {
    const first = await reopen();
    await first.records.insertMany(requestSet());
    await first.close();
    const second = await reopen();
    const page = await second.records.list(
      {},
      { sort: 'createdAt', order: 'asc', page: 1, pageSize: 50 },
    );
    expect(page.items).toEqual(
      [...requestSet()].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      ),
    );
  });

  it('opens a Stage 1 file that has no service requests yet', async () => {
    await writeFile(
      path.replace('nested', ''),
      '<?xml version="1.0" encoding="UTF-8"?>\n<chatelaine>\n  <users></users>\n</chatelaine>\n',
    );
    const store = new FileStore(path.replace('nested', ''));
    await store.init();
    expect(await store.records.countByOwner('riya')).toBe(0);
    await store.close();
  });

  it('refuses to start on a file that is not Chatelaine data', async () => {
    await (await reopen()).close();
    await writeFile(
      path,
      '<chatelaine><users><user><userId>x</userId></user></users></chatelaine>',
    );
    await expect(reopen()).rejects.toThrow(/not a valid Chatelaine data file/);
  });
});
