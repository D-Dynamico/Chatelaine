import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Store } from '../contracts.js';
import { DynamoRecordRepository } from './dynamo-record-repository.js';
import { DynamoTable } from './dynamo-table.js';
import { DynamoUserRepository } from './dynamo-user-repository.js';

export interface DynamoSettings {
  readonly table: string;
  readonly region: string;
  /** Set for DynamoDB Local; left out for AWS itself. */
  readonly endpoint?: string | undefined;
  /** Left out to use the SDK's default chain (environment, profile, role). */
  readonly credentials?: { readonly accessKeyId: string; readonly secretAccessKey: string };
}

/** Users and service requests in one DynamoDB table (D7). */
export class DynamoStore implements Store {
  readonly users: DynamoUserRepository;
  readonly records: DynamoRecordRepository;
  private readonly client: DynamoDBClient;
  private readonly table: DynamoTable;

  constructor(settings: DynamoSettings) {
    this.client = new DynamoDBClient({
      region: settings.region,
      ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
      ...(settings.credentials ? { credentials: settings.credentials } : {}),
    });
    const documents = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.table = new DynamoTable(settings.table, documents, this.client);
    this.users = new DynamoUserRepository(this.table);
    this.records = new DynamoRecordRepository(this.table);
  }

  init(): Promise<void> {
    return this.table.ensureExists();
  }

  /** Dropping and recreating the table is the fastest way to empty a single-table design. */
  async reset(): Promise<void> {
    await this.table.drop();
    await this.table.ensureExists();
  }

  close(): Promise<void> {
    this.client.destroy();
    return Promise.resolve();
  }

  /** Test support: removes the table the store was opened on. */
  dropTable(): Promise<void> {
    return this.table.drop();
  }
}
