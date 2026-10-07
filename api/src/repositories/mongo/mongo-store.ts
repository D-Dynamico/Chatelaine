import { MongoClient } from 'mongodb';
import type { Store } from '../contracts.js';
import { MongoRecordRepository, type RequestDocument } from './mongo-record-repository.js';
import { MongoUserRepository, type UserDocument } from './mongo-user-repository.js';

/** Fail fast at boot rather than hang when the database is unreachable. */
const SERVER_SELECTION_TIMEOUT_MS = 5000;

/** Users and service requests in MongoDB, through the native driver (D5). */
export class MongoStore implements Store {
  readonly users: MongoUserRepository;
  readonly records: MongoRecordRepository;
  private readonly client: MongoClient;

  constructor(uri: string, dbName: string) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
    const db = this.client.db(dbName);
    this.users = new MongoUserRepository(db.collection<UserDocument>('users'));
    this.records = new MongoRecordRepository(db.collection<RequestDocument>('serviceRequests'));
  }

  async init(): Promise<void> {
    await this.client.connect();
    await Promise.all([this.users.createIndexes(), this.records.createIndexes()]);
  }

  async reset(): Promise<void> {
    await Promise.all([this.users.deleteAll(), this.records.deleteAll()]);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  /** Test support: removes the whole database the store was opened on. */
  async dropDatabase(): Promise<void> {
    await this.client.db(this.users.databaseName).dropDatabase();
  }
}
