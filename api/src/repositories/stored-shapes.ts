import { z } from 'zod';
import {
  ACCESS_LEVELS,
  CATEGORIES,
  PRIORITIES,
  REQUEST_STATUSES,
} from '../domain/service-request.js';
import { ROLES, USER_STATUSES } from '../domain/user.js';

/**
 * What adapters that read untyped data (the XML file, DynamoDB items) expect to find. A
 * record that does not match is a storage fault and fails loudly rather than leaking odd
 * shapes into services. Unknown keys (key attributes, sort ranks) are dropped.
 */

/** Null is written as a missing XML element and as a null DynamoDB attribute. */
const nullableText = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

export const storedUser = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string(),
  department: z.string(),
  role: z.enum(ROLES),
  status: z.enum(USER_STATUSES),
  passwordHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: nullableText,
  previousLoginAt: nullableText,
});

export const storedRequest = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  status: z.enum(REQUEST_STATUSES),
  accessLevel: z.enum(ACCESS_LEVELS),
  assignee: nullableText,
  internalNote: nullableText,
  createdAt: z.string(),
  updatedAt: z.string(),
});
