import type { z } from 'zod';
import { ValidationError, type ValidationIssue } from '../domain/errors.js';

function toIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

/**
 * Parses input at the edge. Failure is a ValidationError whose message is the first
 * problem, written for a person, and whose details list every problem (docs/API.md §13).
 */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issues = toIssues(result.error);
  throw new ValidationError(issues[0]?.message ?? 'The request is not valid.', issues);
}
