import type { Page } from '../../domain/paging.js';
import type {
  RecordCounts,
  RecordListQuery,
  RecordScope,
  ServiceRequest,
} from '../../domain/service-request.js';
import type { RecordRepository } from '../contracts.js';
import { countRecords, inRecordScope, queryRecords } from '../in-memory-queries.js';
import type { DocumentAccess } from './file-user-repository.js';

/** Service requests in the XML document; queries run over the in-memory copy. */
export class FileRecordRepository implements RecordRepository {
  constructor(private readonly store: DocumentAccess) {}

  list(scope: RecordScope, query: RecordListQuery): Promise<Page<ServiceRequest>> {
    return Promise.resolve(queryRecords(this.store.read().requests, scope, query));
  }

  summary(scope: RecordScope): Promise<RecordCounts> {
    const inScope = this.store.read().requests.filter((item) => inRecordScope(item, scope));
    return Promise.resolve(countRecords(inScope));
  }

  countByOwner(ownerId: string): Promise<number> {
    const owned = this.store.read().requests.filter((item) => item.ownerId === ownerId);
    return Promise.resolve(owned.length);
  }

  deleteByOwner(ownerId: string): Promise<number> {
    return this.store.mutate((draft) => {
      const before = draft.requests.length;
      draft.requests = draft.requests.filter((item) => item.ownerId !== ownerId);
      return before - draft.requests.length;
    });
  }

  async insertMany(items: readonly ServiceRequest[]): Promise<void> {
    await this.store.mutate((draft) => {
      draft.requests.push(...items.map((item) => ({ ...item })));
    });
  }
}
