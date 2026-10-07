import { randomUUID } from 'node:crypto';
import { describe, it } from 'vitest';
import { DynamoStore } from '../../src/repositories/dynamo/dynamo-store.js';
import { describeRecordRepositoryContract } from './record-repository.contract.js';
import { describeUserRepositoryContract, type StoreHandle } from './user-repository.contract.js';

const endpoint = process.env.DYNAMO_ENDPOINT;

/** A fresh table per test, dropped afterwards. DynamoDB Local accepts any credentials. */
function openDynamoStore(dynamoEndpoint: string): Promise<StoreHandle> {
  const store = new DynamoStore({
    endpoint: dynamoEndpoint,
    region: 'local',
    table: `chatelaine_test_${randomUUID().slice(0, 8)}`,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
  return Promise.resolve({
    store,
    dispose: async () => {
      await store.dropTable();
      await store.close();
    },
  });
}

if (endpoint) {
  describeUserRepositoryContract('dynamo', () => openDynamoStore(endpoint));
  describeRecordRepositoryContract('dynamo', () => openDynamoStore(endpoint));
} else {
  // The suite name is the printed reason (docs/TEST_PLAN.md §35); CI always sets it.
  describe.skip('dynamo contract suites: skipped because DYNAMO_ENDPOINT is unset', () => {
    it('needs DynamoDB Local to run against', () => undefined);
  });
}
