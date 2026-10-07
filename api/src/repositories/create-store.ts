import type { StorageConfig } from '../config.js';
import type { Store } from './contracts.js';
import { FileStore } from './file/file-store.js';

/** Picks the adapter that STORAGE selects (docs/ARCHITECTURE.md §6). */
export function createStore(storage: StorageConfig): Store {
  switch (storage.kind) {
    case 'file':
      return new FileStore(storage.dataFile);
    case 'mongo':
    case 'dynamo':
      // Open item in docs/sessions/2026-10-07-stage1.md: both adapters land in Stage 2.
      throw new Error(`STORAGE=${storage.kind} is not built yet. Use STORAGE=file for now.`);
  }
}
