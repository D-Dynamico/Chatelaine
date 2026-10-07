import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import type { ServiceRequest } from '../../domain/service-request.js';
import type { NewUser } from '../../domain/user.js';
import { storedRequest, storedUser } from '../stored-shapes.js';
import { itemElement, listElement, xmlDocument, type XmlField } from './xml-writer.js';

/** Everything the XML file holds. Users keep their hash here, inside the adapter only. */
export interface XmlDocument {
  users: NewUser[];
  requests: ServiceRequest[];
}

const ROOT = 'chatelaine';
const LIST_PATHS = new Set([`${ROOT}.users.user`, `${ROOT}.serviceRequests.request`]);

const parser = new XMLParser({
  // Keep every value a string ("007" must not become 7) and exactly as written.
  parseTagValue: false,
  trimValues: false,
  // Ask for string paths explicitly; isArray then always receives a string.
  jPath: true,
  isArray: (_name, jpath) => typeof jpath === 'string' && LIST_PATHS.has(jpath),
});

/**
 * An empty list element parses as "", and a file from Stage 1 has no serviceRequests at
 * all, so each list accepts both. Formatting whitespace arrives as "#text" keys, which
 * z.object discards.
 */
function listOf<T extends z.ZodType>(tag: string, item: T) {
  return z
    .union([z.literal(''), z.object({ [tag]: z.array(item).default([]) })])
    .optional()
    .transform((list) => (list === undefined || list === '' ? [] : (list[tag] as z.output<T>[])));
}

const documentSchema = z.object({
  [ROOT]: z.object({
    users: listOf('user', storedUser),
    serviceRequests: listOf('request', storedRequest),
  }),
});

export function emptyDocument(): XmlDocument {
  return { users: [], requests: [] };
}

export function parseXmlDocument(xml: string, source: string): XmlDocument {
  const result = documentSchema.safeParse(parser.parse(xml));
  if (!result.success) {
    throw new Error(
      `${source} is not a valid Chatelaine data file:\n${z.prettifyError(result.error)}`,
    );
  }
  const root = result.data[ROOT];
  return { users: root.users, requests: root.serviceRequests };
}

/** Fixed element order, so the file diffs cleanly between writes. */
function userFields(user: NewUser): XmlField[] {
  return [
    ['userId', user.userId],
    ['displayName', user.displayName],
    ['email', user.email],
    ['department', user.department],
    ['role', user.role],
    ['status', user.status],
    ['passwordHash', user.passwordHash],
    ['createdAt', user.createdAt],
    ['updatedAt', user.updatedAt],
    ['lastLoginAt', user.lastLoginAt],
  ];
}

function requestFields(request: ServiceRequest): XmlField[] {
  return [
    ['id', request.id],
    ['ownerId', request.ownerId],
    ['title', request.title],
    ['category', request.category],
    ['priority', request.priority],
    ['status', request.status],
    ['accessLevel', request.accessLevel],
    ['assignee', request.assignee],
    ['internalNote', request.internalNote],
    ['createdAt', request.createdAt],
    ['updatedAt', request.updatedAt],
  ];
}

export function serializeXmlDocument(document: XmlDocument): string {
  const users = document.users.map((user) => itemElement('user', userFields(user), 2));
  const requests = document.requests.map((request) =>
    itemElement('request', requestFields(request), 2),
  );
  return xmlDocument(ROOT, [
    listElement('users', users, 1),
    listElement('serviceRequests', requests, 1),
  ]);
}
