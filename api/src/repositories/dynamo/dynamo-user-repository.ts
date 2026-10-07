import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
import { countAdmins, queryUsers } from '../in-memory-queries.js';
import { storedUser } from '../stored-shapes.js';
import { GSI1, type DynamoTable } from './dynamo-table.js';

const USER_TYPE = 'TYPE#USER';
const PROFILE = 'PROFILE';
const EXISTS = 'attribute_exists(PK)';

/** Users live at PK = USER#<id>, SK = PROFILE; GSI1 lists them all by type. */
const userKey = (userId: string) => ({ PK: `USER#${userId}`, SK: PROFILE });

function toItem(user: NewUser) {
  return { ...userKey(user.userId), GSI1PK: USER_TYPE, GSI1SK: user.userId, ...user };
}

/** Builds "SET #a = :a, ..." from the fields actually present in the patch. */
function setExpression(fields: Record<string, unknown>) {
  const names = Object.keys(fields).filter((name) => fields[name] !== undefined);
  return {
    UpdateExpression: `SET ${names.map((name) => `#${name} = :${name}`).join(', ')}`,
    ExpressionAttributeNames: Object.fromEntries(names.map((name) => [`#${name}`, name])),
    ExpressionAttributeValues: Object.fromEntries(names.map((name) => [`:${name}`, fields[name]])),
  };
}

export class DynamoUserRepository implements UserRepository {
  constructor(private readonly table: DynamoTable) {}

  async findById(userId: string): Promise<User | null> {
    const stored = await this.getStored(userId);
    return stored ? toUser(stored) : null;
  }

  async findCredentials(userId: string): Promise<UserCredentials | null> {
    const stored = await this.getStored(userId);
    return stored ? { user: toUser(stored), passwordHash: stored.passwordHash } : null;
  }

  async create(input: NewUser): Promise<User> {
    const put = new PutCommand({
      TableName: this.table.name,
      Item: toItem(input),
      ConditionExpression: 'attribute_not_exists(PK)',
    });
    await this.conditional(() => this.table.documents.send(put), userIdTaken);
    return toUser(input);
  }

  async update(userId: string, patch: UserPatch): Promise<User> {
    const update = new UpdateCommand({
      TableName: this.table.name,
      Key: userKey(userId),
      ConditionExpression: EXISTS,
      ReturnValues: 'ALL_NEW',
      ...setExpression({ ...patch }),
    });
    const result = await this.conditional(
      () => this.table.documents.send(update),
      () => userNotFound(userId),
    );
    return toUser(storedUser.parse(result.Attributes));
  }

  async delete(userId: string): Promise<void> {
    const remove = new DeleteCommand({
      TableName: this.table.name,
      Key: userKey(userId),
      ConditionExpression: EXISTS,
    });
    await this.conditional(
      () => this.table.documents.send(remove),
      () => userNotFound(userId),
    );
  }

  async touchLastLogin(userId: string, at: string): Promise<void> {
    const update = new UpdateCommand({
      TableName: this.table.name,
      Key: userKey(userId),
      ConditionExpression: EXISTS,
      ...setExpression({ lastLoginAt: at }),
    });
    await this.conditional(
      () => this.table.documents.send(update),
      () => userNotFound(userId),
    );
  }

  /** Reads every user through GSI1, then filters, sorts and pages in memory (D7). */
  async list(query: UserListQuery): Promise<Page<User>> {
    return queryUsers(await this.allUsers(), query);
  }

  async countAdmins(filter: { status?: UserStatus }): Promise<number> {
    return countAdmins(await this.allUsers(), filter);
  }

  private async allUsers(): Promise<User[]> {
    const items = await this.table.queryAll({
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :type',
      ExpressionAttributeValues: { ':type': USER_TYPE },
    });
    return items.map((item) => toUser(storedUser.parse(item)));
  }

  private async getStored(userId: string): Promise<NewUser | null> {
    const result = await this.table.documents.send(
      new GetCommand({ TableName: this.table.name, Key: userKey(userId) }),
    );
    return result.Item ? storedUser.parse(result.Item) : null;
  }

  /** Runs a conditional write, turning a failed condition into the domain error given. */
  private async conditional<T>(
    write: () => Promise<T>,
    onConditionFailed: () => Error,
  ): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) throw onConditionFailed();
      throw error;
    }
  }
}
