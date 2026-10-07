import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { ROLES, USER_STATUSES, type NewUser } from '../../domain/user.js';

/** Everything the XML file holds. Users keep their hash here, inside the adapter only. */
export interface XmlDocument {
  users: NewUser[];
}

const USER_PATH = 'chatelaine.users.user';
const INDENT = '  ';

const parser = new XMLParser({
  // Keep every value a string ("007" must not become 7) and exactly as written.
  parseTagValue: false,
  trimValues: false,
  isArray: (_name, jpath) => jpath === USER_PATH,
});

const storedUser = z.object({
  userId: z.string(),
  displayName: z.string(),
  email: z.string(),
  department: z.string(),
  role: z.enum(ROLES),
  status: z.enum(USER_STATUSES),
  passwordHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // A null lastLoginAt is written as a missing element.
  lastLoginAt: z
    .string()
    .optional()
    .transform((value) => value ?? null),
});

// An empty <users></users> parses as "", so both shapes are accepted. Formatting
// whitespace arrives as "#text" keys, which z.object discards.
const documentSchema = z.object({
  chatelaine: z.object({
    users: z.union([z.literal(''), z.object({ user: z.array(storedUser).default([]) })]),
  }),
});

export function emptyDocument(): XmlDocument {
  return { users: [] };
}

export function parseXmlDocument(xml: string, source: string): XmlDocument {
  const result = documentSchema.safeParse(parser.parse(xml));
  if (!result.success) {
    throw new Error(
      `${source} is not a valid Chatelaine data file:\n${z.prettifyError(result.error)}`,
    );
  }
  const { users } = result.data.chatelaine;
  return { users: users === '' ? [] : users.user };
}

// Writing is done by hand: the document has one fixed shape, text content needs only three
// escapes, and fast-xml-parser 5.11 deprecates its builder in favour of a separate package.
const TEXT_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
// Control characters other than tab, newline and carriage return are not legal in XML 1.0.
const ILLEGAL_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

function escapeText(value: string): string {
  if (ILLEGAL_XML_CHARS.test(value)) {
    throw new Error('A value contains a control character that XML cannot store.');
  }
  return value.replace(/[&<>]/g, (char) => TEXT_ESCAPES[char] ?? char);
}

/** Fixed element order, so the file diffs cleanly between writes. */
function userElement(user: NewUser): string {
  const fields: [string, string | null][] = [
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
  const children = fields
    .filter((field): field is [string, string] => field[1] !== null)
    .map(([name, value]) => `${INDENT.repeat(3)}<${name}>${escapeText(value)}</${name}>`);
  return [`${INDENT.repeat(2)}<user>`, ...children, `${INDENT.repeat(2)}</user>`].join('\n');
}

export function serializeXmlDocument(document: XmlDocument): string {
  const users = document.users.map(userElement);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<chatelaine>',
    users.length === 0 ? `${INDENT}<users></users>` : `${INDENT}<users>`,
    ...users,
    ...(users.length === 0 ? [] : [`${INDENT}</users>`]),
    '</chatelaine>',
    '',
  ].join('\n');
}
