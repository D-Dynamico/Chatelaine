import type { StorageConfig } from '../config.js';
import type { Store } from './contracts.js';
import { DynamoStore } from './dynamo/dynamo-store.js';
import { FileStore } from './file/file-store.js';
import { MongoStore } from './mongo/mongo-store.js';

/** Picks the adapter that STORAGE selects (docs/ARCHITECTURE.md §6). */
export function createStore(storage: StorageConfig): Store {
  switch (storage.kind) {
    case 'file':
      return new FileStore(storage.dataFile);
    case 'mongo':
      return new MongoStore(storage.uri, storage.dbName);
    case 'dynamo':
      return new DynamoStore(storage);
  }
}
