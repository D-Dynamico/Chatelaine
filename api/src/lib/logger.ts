import { pino, type DestinationStream, type Logger, type LoggerOptions } from 'pino';
import type { Config } from '../config.js';

export type { Logger };

/**
 * pino-http logs every request header, so bearer tokens would otherwise reach the logs and
 * anyone who can read them could replay a session until it expires.
 */
export const REDACTED_PATHS = ['req.headers.authorization', 'req.headers.cookie'];

/** JSON logs everywhere except local development, where they are pretty-printed. */
export function createLogger(
  config: Pick<Config, 'env' | 'logLevel'>,
  destination?: DestinationStream,
): Logger {
  const options: LoggerOptions = {
    level: config.logLevel,
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  };
  if (destination) return pino(options, destination);
  if (config.env === 'development') {
    return pino({
      ...options,
      transport: { target: 'pino-pretty', options: { singleLine: true } },
    });
  }
  return pino(options);
}
