import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Config } from './config.js';
import type { Logger } from './lib/logger.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import {
  REQUEST_ID_HEADER,
  requestContext,
  SERVER_TIMING_HEADER,
} from './middleware/request-context.js';
import { healthRoutes } from './routes/health.routes.js';

export const API_BASE_PATH = '/api';
/** Every body this API accepts is a small form; anything larger is a mistake or abuse. */
const JSON_BODY_LIMIT = '10kb';
const EXPOSED_HEADERS = [REQUEST_ID_HEADER, SERVER_TIMING_HEADER, 'Location'];

export interface AppDeps {
  readonly config: Config;
  readonly logger: Logger;
  readonly version: string;
}

/**
 * Builds the Express app from its dependencies. main.ts calls it with real ones; tests
 * call it with a temp store and a silent logger, so nothing here reads globals.
 */
export function buildApp(deps: AppDeps): Express {
  const { config, logger, version } = deps;
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.use(requestContext(logger));
  app.use(helmet());
  app.use(cors({ origin: [...config.corsOrigins], exposedHeaders: EXPOSED_HEADERS }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = express.Router();
  api.use(healthRoutes({ storage: config.storage.kind, version }));
  app.use(API_BASE_PATH, api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
