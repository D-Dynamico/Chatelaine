import { expect } from 'vitest';
import type { ErrorCode } from '../../src/domain/errors.js';

const STACK_FRAME = /\bat .+:\d+:\d+/;

/** Asserts the one error shape from docs/API.md §13, and nothing else in the body. */
export function expectErrorShape(body: unknown, code: ErrorCode): void {
  expect(Object.keys(body as object)).toEqual(['error']);
  const { error } = body as { error: Record<string, unknown> };
  const allowedKeys =
    code === 'VALIDATION_FAILED' ? ['code', 'message', 'details'] : ['code', 'message'];
  expect(Object.keys(error).every((key) => allowedKeys.includes(key))).toBe(true);
  expect(error.code).toBe(code);
  expect(typeof error.message).toBe('string');
  expect(String(error.message)).not.toMatch(STACK_FRAME);
}
