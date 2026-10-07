import { randomUUID } from 'node:crypto';
import { describe, it } from 'vitest';
import { MongoStore } from '../../src/repositories/mongo/mongo-store.js';
import { describeRecordRepositoryContract } from './record-repository.contract.js';
import { describeUserRepositoryContract, type StoreHandle } from './user-repository.contract.js';

const uri = process.env.MONGO_URI;

/** A fresh database per test, dropped afterwards, so tests never see each other's data. */
async function openMongoStore(mongoUri: string): Promise<StoreHandle> {
  const store = new MongoStore(mongoUri, `chatelaine_test_${randomUUID().slice(0, 8)}`);
  return Promise.resolve({
    store,
    dispose: async () => {
      await store.dropDatabase();
      await store.close();
    },
  });
}

if (uri) {
  describeUserRepositoryContract('mongo', () => openMongoStore(uri));
  describeRecordRepositoryContract('mongo', () => openMongoStore(uri));
} else {
  // The suite name is the printed reason (docs/TEST_PLAN.md §35); CI always sets MONGO_URI.
  describe.skip('mongo contract suites: skipped because MONGO_URI is unset', () => {
    it('needs a MongoDB to run against', () => undefined);
  });
}
