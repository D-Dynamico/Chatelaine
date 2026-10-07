import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { RequestHandler, Response } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from '../lib/logger.js';

export const REQUEST_ID_HEADER = 'X-Request-Id';
export const SERVER_TIMING_HEADER = 'Server-Timing';

export interface RequestTiming {
  readonly startedAt: number;
  /** The simulated delay requested with ?delay= (docs/API.md §9). */
  delayMs: number;
}

/** Called by the simulation middleware so Server-Timing can split delay from real work. */
export function recordSimulatedDelay(res: Response, delayMs: number): void {
  if (res.locals.timing) res.locals.timing.delayMs = delayMs;
}

function formatServerTiming(timing: RequestTiming): string {
  const elapsed = performance.now() - timing.startedAt;
  const appMs = Math.max(0, elapsed - timing.delayMs);
  return `delay;dur=${String(timing.delayMs)}, app;dur=${appMs.toFixed(1)}`;
}

/**
 * Server-Timing must report time up to the moment headers go out, which happens inside
 * res.json(), after any handler could still set a header. Wrapping writeHead is the one
 * point that runs exactly then, for every response, including errors.
 */
function stampServerTimingOnWriteHead(res: Response, timing: RequestTiming): void {
  const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => Response;
  res.writeHead = ((...args: unknown[]) => {
    res.setHeader(SERVER_TIMING_HEADER, formatServerTiming(timing));
    return writeHead(...args);
  }) as Response['writeHead'];
}

/**
 * First middleware in the chain: gives the request an ID (echoed in X-Request-Id and on
 * every log line), a child logger at req.log, and a start time for Server-Timing.
 */
export function requestContext(logger: Logger): RequestHandler {
  const httpLogger = pinoHttp({
    logger,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
  });

  return (req, res, next) => {
    const timing: RequestTiming = { startedAt: performance.now(), delayMs: 0 };
    res.locals.timing = timing;
    stampServerTimingOnWriteHead(res, timing);
    httpLogger(req, res, next);
  };
}
