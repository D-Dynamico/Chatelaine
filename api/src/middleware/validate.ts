import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { ValidationError, type ValidationIssue } from '../domain/errors.js';

type RequestPart = 'body' | 'params' | 'query';

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

/**
 * Route middleware: parses one part of the request before the controller runs. Express 5
 * makes req.query read-only, so parsed values are kept per response, keyed by the schema
 * that produced them, and read back with readValidated.
 */
export function validate(part: RequestPart, schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const parsed: unknown = parseOrThrow(schema, req[part]);
    res.locals.validated ??= new Map();
    res.locals.validated.set(schema, parsed);
    next();
  };
}

/**
 * Returns what validate(part, schema) parsed. Keying by the schema object means a value can
 * only be read back as the type of the schema that actually produced it.
 */
export function readValidated<S extends z.ZodType>(res: Response, schema: S): z.output<S> {
  const validated = res.locals.validated;
  if (!validated?.has(schema)) {
    throw new Error('readValidated was called for a schema that no validate() step ran.');
  }
  // Safe: the only writer stores schema.parse output under that same schema key.
  return validated.get(schema) as z.output<S>;
}
