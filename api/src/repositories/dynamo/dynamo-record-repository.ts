import type { Page } from '../../domain/paging.js';
import {
  PRIORITY_RANK,
  STATUS_RANK,
  toServiceRequest,
  type RecordCounts,
  type RecordListQuery,
  type RecordScope,
  type ServiceRequest,
} from '../../domain/service-request.js';
import type { RecordRepository } from '../contracts.js';
import { applyRecordQuery, countRecords } from '../in-memory-queries.js';
import { storedRequest } from '../stored-shapes.js';
import { GSI1, type DynamoTable } from './dynamo-table.js';

const REQUEST_TYPE = 'TYPE#SR';
const REQUEST_PREFIX = 'SR#';

/**
 * A request lives in its owner's partition (PK = USER#<ownerId>, SK = SR#<createdAt>#<id>),
 * so a General User's list is a Query on their own key: ownership is enforced by the key
 * itself. GSI1 lists every request for admins.
 */
function requestKey(item: ServiceRequest) {
  return { PK: `USER#${item.ownerId}`, SK: `${REQUEST_PREFIX}${item.createdAt}#${item.id}` };
}

function toItem(item: ServiceRequest) {
  return {
    ...requestKey(item),
    GSI1PK: REQUEST_TYPE,
    GSI1SK: `${item.createdAt}#${item.id}`,
    ...toServiceRequest(item),
    priorityRank: PRIORITY_RANK[item.priority],
    statusRank: STATUS_RANK[item.status],
  };
}

/** The access level, when the scope has one, is a filter inside the same Query request. */
function accessLevelFilter(scope: RecordScope) {
  return scope.accessLevel === undefined
    ? {}
    : {
        FilterExpression: 'accessLevel = :level',
        ExpressionAttributeValues: { ':level': scope.accessLevel },
      };
}

export class DynamoRecordRepository implements RecordRepository {
  constructor(private readonly table: DynamoTable) {}

  /**
   * The scope is applied only by the key query in loadScope. Sorting by other fields and
   * offset paging then run in memory: the D7 limitation.
   */
  async list(scope: RecordScope, query: RecordListQuery): Promise<Page<ServiceRequest>> {
    return applyRecordQuery(await this.loadScope(scope), query);
  }

  async summary(scope: RecordScope): Promise<RecordCounts> {
    return countRecords(await this.loadScope(scope));
  }

  async countByOwner(ownerId: string): Promise<number> {
    return (await this.loadScope({ ownerId })).length;
  }

  async deleteByOwner(ownerId: string): Promise<number> {
    const owned = await this.loadScope({ ownerId });
    await this.table.batchWrite(
      owned.map((item) => ({ DeleteRequest: { Key: requestKey(item) } })),
    );
    return owned.length;
  }

  async insertMany(items: readonly ServiceRequest[]): Promise<void> {
    await this.table.batchWrite(items.map((item) => ({ PutRequest: { Item: toItem(item) } })));
  }

  private async loadScope(scope: RecordScope): Promise<ServiceRequest[]> {
    const filter = accessLevelFilter(scope);
    const items =
      scope.ownerId === undefined
        ? await this.table.queryAll({
            IndexName: GSI1,
            KeyConditionExpression: 'GSI1PK = :type',
            ...filter,
            ExpressionAttributeValues: {
              ':type': REQUEST_TYPE,
              ...filter.ExpressionAttributeValues,
            },
          })
        : await this.table.queryAll({
            KeyConditionExpression: 'PK = :owner AND begins_with(SK, :prefix)',
            ...filter,
            ExpressionAttributeValues: {
              ':owner': `USER#${scope.ownerId}`,
              ':prefix': REQUEST_PREFIX,
              ...filter.ExpressionAttributeValues,
            },
          });
    return items.map((item) => toServiceRequest(storedRequest.parse(item)));
  }
}
