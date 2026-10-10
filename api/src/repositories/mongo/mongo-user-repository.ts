import type { Collection, Filter } from 'mongodb';
import { userIdTaken, userNotFound } from '../../domain/errors.js';
import type { Page } from '../../domain/paging.js';
import {
  toUser,
  type NewUser,
  type User,
  type UserCredentials,
  type UserListQuery,
  type UserPatch,
  type UserStatus,
} from '../../domain/user.js';
import type { UserRepository } from '../contracts.js';
import {
  definedOnly,
  isDuplicateKey,
  literalPattern,
  pageWindow,
  stableSort,
} from './mongo-queries.js';

/** A user as stored: every User field plus the hash, which never leaves this adapter. */
export type UserDocument = NewUser;

const NO_ID = { projection: { _id: 0 } } as const;

function listFilter(query: UserListQuery): Filter<UserDocument> {
  const pattern = query.q === undefined ? undefined : literalPattern(query.q);
  return {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(pattern
      ? { $or: [{ userId: pattern }, { displayName: pattern }, { email: pattern }] }
      : {}),
  };
}

export class MongoUserRepository implements UserRepository {
  constructor(private readonly collection: Collection<UserDocument>) {}

  get databaseName(): string {
    return this.collection.dbName;
  }

  async createIndexes(): Promise<void> {
    await this.collection.createIndex({ userId: 1 }, { unique: true });
  }

  async deleteAll(): Promise<void> {
    await this.collection.deleteMany({});
  }

  async findById(userId: string): Promise<User | null> {
    const found = await this.collection.findOne({ userId }, NO_ID);
    return found ? toUser(found) : null;
  }

  async findCredentials(userId: string): Promise<UserCredentials | null> {
    const found = await this.collection.findOne({ userId }, NO_ID);
    return found ? { user: toUser(found), passwordHash: found.passwordHash } : null;
  }

  async create(input: NewUser): Promise<User> {
    try {
      // A copy, because insertOne adds an _id to the object it is given.
      await this.collection.insertOne({ ...input });
    } catch (error) {
      if (isDuplicateKey(error)) throw userIdTaken();
      throw error;
    }
    return toUser(input);
  }

  async update(userId: string, patch: UserPatch): Promise<User> {
    const updated = await this.collection.findOneAndUpdate(
      { userId },
      { $set: definedOnly(patch) },
      { ...NO_ID, returnDocument: 'after' },
    );
    if (!updated) throw userNotFound(userId);
    return toUser(updated);
  }

  async delete(userId: string): Promise<void> {
    const { deletedCount } = await this.collection.deleteOne({ userId });
    if (deletedCount === 0) throw userNotFound(userId);
  }

  async touchLastLogin(userId: string, at: string): Promise<void> {
    const { matchedCount } = await this.collection.updateOne(
      { userId },
      // An aggregation-pipeline update, so the old value is read and moved in the same atomic
      // write; two separate $set operators cannot refer to each other's fields.
      [{ $set: { previousLoginAt: '$lastLoginAt', lastLoginAt: { $literal: at } } }],
    );
    if (matchedCount === 0) throw userNotFound(userId);
  }

  async list(query: UserListQuery): Promise<Page<User>> {
    const filter = listFilter(query);
    const [documents, total] = await Promise.all([
      this.collection
        .find(filter, NO_ID)
        .sort(stableSort(query.sort, 'userId', query.order))
        .skip(pageWindow(query).skip)
        .limit(pageWindow(query).limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);
    return { items: documents.map(toUser), page: query.page, pageSize: query.pageSize, total };
  }

  countAdmins(filter: { status?: UserStatus }): Promise<number> {
    return this.collection.countDocuments({
      role: 'ADMIN',
      ...(filter.status ? { status: filter.status } : {}),
    });
  }
}
