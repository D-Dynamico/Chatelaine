import type { Collection, Filter } from 'mongodb';
import type { Page } from '../../domain/paging.js';
import {
  emptyRecordCounts,
  PRIORITY_RANK,
  STATUS_RANK,
  toServiceRequest,
  type RecordCounts,
  type RecordListQuery,
  type RecordScope,
  type RecordSortField,
  type ServiceRequest,
} from '../../domain/service-request.js';
import type { RecordRepository } from '../contracts.js';
import { literalPattern, pageWindow, stableSort } from './mongo-queries.js';

/** A request as stored, with the ranks that let priority and status sort by meaning (D14). */
export interface RequestDocument extends ServiceRequest {
  readonly priorityRank: number;
  readonly statusRank: number;
}

const NO_ID = { projection: { _id: 0 } } as const;

const SORT_FIELDS: Readonly<Record<RecordSortField, keyof RequestDocument>> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priorityRank',
  status: 'statusRank',
  title: 'title',
};

function toDocument(item: ServiceRequest): RequestDocument {
  return {
    ...toServiceRequest(item),
    priorityRank: PRIORITY_RANK[item.priority],
    statusRank: STATUS_RANK[item.status],
  };
}

/** The scope goes into the query itself; the caller's filters are ANDed on top of it. */
function scopeFilter(scope: RecordScope): Filter<RequestDocument> {
  return {
    ...(scope.ownerId === undefined ? {} : { ownerId: scope.ownerId }),
    ...(scope.accessLevel === undefined ? {} : { accessLevel: scope.accessLevel }),
  };
}

function listFilter(scope: RecordScope, query: RecordListQuery): Filter<RequestDocument> {
  const clauses: Filter<RequestDocument>[] = [scopeFilter(scope)];
  if (query.status) clauses.push({ status: query.status });
  if (query.priority) clauses.push({ priority: query.priority });
  if (query.accessLevel) clauses.push({ accessLevel: query.accessLevel });
  if (query.q) {
    const pattern = literalPattern(query.q);
    clauses.push({ $or: [{ id: pattern }, { title: pattern }] });
  }
  return { $and: clauses };
}

interface FacetCount {
  _id: string;
  n: number;
}
interface SummaryFacets {
  byStatus: FacetCount[];
  byPriority: FacetCount[];
  byAccessLevel: FacetCount[];
}

const countBy = (field: string) => [{ $group: { _id: `$${field}`, n: { $sum: 1 } } }];

export class MongoRecordRepository implements RecordRepository {
  constructor(private readonly collection: Collection<RequestDocument>) {}

  async createIndexes(): Promise<void> {
    await Promise.all([
      this.collection.createIndex({ id: 1 }, { unique: true }),
      this.collection.createIndex({ ownerId: 1, accessLevel: 1, createdAt: -1 }),
    ]);
  }

  async deleteAll(): Promise<void> {
    await this.collection.deleteMany({});
  }

  async list(scope: RecordScope, query: RecordListQuery): Promise<Page<ServiceRequest>> {
    const filter = listFilter(scope, query);
    const { skip, limit } = pageWindow(query);
    const [documents, total] = await Promise.all([
      this.collection
        .find(filter, NO_ID)
        .sort(stableSort(SORT_FIELDS[query.sort], 'id', query.order))
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);
    return {
      items: documents.map(toServiceRequest),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /** One aggregation counts every dimension over the scope. */
  async summary(scope: RecordScope): Promise<RecordCounts> {
    const [facets] = await this.collection
      .aggregate<SummaryFacets>([
        { $match: scopeFilter(scope) },
        {
          $facet: {
            byStatus: countBy('status'),
            byPriority: countBy('priority'),
            byAccessLevel: countBy('accessLevel'),
          },
        },
      ])
      .toArray();
    const counts = emptyRecordCounts();
    const fill = (target: Record<string, number>, rows: FacetCount[] = []) => {
      for (const row of rows) target[row._id] = row.n;
    };
    fill(counts.byStatus, facets?.byStatus);
    fill(counts.byPriority, facets?.byPriority);
    fill(counts.byAccessLevel, facets?.byAccessLevel);
    const total = Object.values(counts.byStatus).reduce((sum, n) => sum + n, 0);
    return { ...counts, total };
  }

  countByOwner(ownerId: string): Promise<number> {
    return this.collection.countDocuments({ ownerId });
  }

  async deleteByOwner(ownerId: string): Promise<number> {
    return (await this.collection.deleteMany({ ownerId })).deletedCount;
  }

  async insertMany(items: readonly ServiceRequest[]): Promise<void> {
    // The driver refuses an empty batch, and an empty seed is a valid one.
    if (items.length === 0) return;
    await this.collection.insertMany(items.map(toDocument));
  }
}
