import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  waitUntilTableExists,
  waitUntilTableNotExists,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  QueryCommand,
  type DynamoDBDocumentClient,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';

/** Single-table key layout (docs/ARCHITECTURE.md §6, D7). */
export const GSI1 = 'GSI1';
const KEY_ATTRIBUTES = ['PK', 'SK', 'GSI1PK', 'GSI1SK'] as const;
/** DynamoDB's limit for one BatchWriteItem call. */
const BATCH_LIMIT = 25;
const MAX_BATCH_ATTEMPTS = 5;
const TABLE_WAIT_SECONDS = 60;

export type DynamoItem = Record<string, unknown>;
type WriteRequest = { PutRequest: { Item: DynamoItem } } | { DeleteRequest: { Key: DynamoItem } };

/** The table itself: creating and dropping it, paged queries and batched writes. */
export class DynamoTable {
  constructor(
    readonly name: string,
    readonly documents: DynamoDBDocumentClient,
    private readonly client: DynamoDBClient,
  ) {}

  async ensureExists(): Promise<void> {
    try {
      await this.client.send(new DescribeTableCommand({ TableName: this.name }));
      return;
    } catch (error) {
      if (!(error instanceof ResourceNotFoundException)) throw error;
    }
    await this.client.send(
      new CreateTableCommand({
        TableName: this.name,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: KEY_ATTRIBUTES.map((name) => ({
          AttributeName: name,
          AttributeType: 'S',
        })),
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: GSI1,
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    );
    await waitUntilTableExists(
      { client: this.client, maxWaitTime: TABLE_WAIT_SECONDS },
      { TableName: this.name },
    );
  }

  async drop(): Promise<void> {
    try {
      await this.client.send(new DeleteTableCommand({ TableName: this.name }));
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return;
      throw error;
    }
    await waitUntilTableNotExists(
      { client: this.client, maxWaitTime: TABLE_WAIT_SECONDS },
      { TableName: this.name },
    );
  }

  /** Every item a query matches, following LastEvaluatedKey across pages. */
  async queryAll(
    input: Omit<QueryCommandInput, 'TableName' | 'ExclusiveStartKey'>,
  ): Promise<unknown[]> {
    const items: unknown[] = [];
    let startKey: DynamoItem | undefined;
    do {
      const page = await this.documents.send(
        new QueryCommand({ ...input, TableName: this.name, ExclusiveStartKey: startKey }),
      );
      items.push(...(page.Items ?? []));
      startKey = page.LastEvaluatedKey;
    } while (startKey);
    return items;
  }

  /** Writes in batches of 25, retrying whatever DynamoDB reports as unprocessed. */
  async batchWrite(requests: readonly WriteRequest[]): Promise<void> {
    for (let start = 0; start < requests.length; start += BATCH_LIMIT) {
      let pending: WriteRequest[] = requests.slice(start, start + BATCH_LIMIT);
      for (let attempt = 1; pending.length > 0; attempt += 1) {
        if (attempt > MAX_BATCH_ATTEMPTS) throw new Error('DynamoDB left writes unprocessed');
        const result = await this.documents.send(
          new BatchWriteCommand({ RequestItems: { [this.name]: pending } }),
        );
        pending = (result.UnprocessedItems?.[this.name] ?? []) as WriteRequest[];
      }
    }
  }
}
