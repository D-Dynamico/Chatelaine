/**
 * Writes the data file by hand: it has one fixed shape, text content needs only three
 * escapes, and fast-xml-parser 5.11 deprecates its builder in favour of a separate package.
 */

const INDENT = '  ';
const TEXT_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
// Control characters other than tab, newline and carriage return are not legal in XML 1.0.
const ILLEGAL_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/** A field written as a child element; null means the element is left out. */
export type XmlField = readonly [name: string, value: string | null];

function escapeText(value: string): string {
  if (ILLEGAL_XML_CHARS.test(value)) {
    throw new Error('A value contains a control character that XML cannot store.');
  }
  return value.replace(/[&<>]/g, (char) => TEXT_ESCAPES[char] ?? char);
}

/** One item, such as a <user>, with a child element per field in the order given. */
export function itemElement(tag: string, fields: readonly XmlField[], depth: number): string {
  const children = fields
    .filter((field): field is readonly [string, string] => field[1] !== null)
    .map(([name, value]) => `${INDENT.repeat(depth + 1)}<${name}>${escapeText(value)}</${name}>`);
  return [`${INDENT.repeat(depth)}<${tag}>`, ...children, `${INDENT.repeat(depth)}</${tag}>`].join(
    '\n',
  );
}

/** A list such as <users>; written as <users></users> when empty. */
export function listElement(tag: string, items: readonly string[], depth: number): string {
  const indent = INDENT.repeat(depth);
  if (items.length === 0) return `${indent}<${tag}></${tag}>`;
  return [`${indent}<${tag}>`, ...items, `${indent}</${tag}>`].join('\n');
}

export function xmlDocument(rootTag: string, children: readonly string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${rootTag}>`,
    ...children,
    `</${rootTag}>`,
    '',
  ].join('\n');
}
