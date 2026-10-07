import type { StorageConfig } from '../config.js';
import type { Store } from './contracts.js';
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
      // Open item in docs/sessions/2026-10-07-stage2.md: lands in substep 2.7.
      throw new Error('STORAGE=dynamo is not built yet. Use STORAGE=file or STORAGE=mongo.');
  }
}
