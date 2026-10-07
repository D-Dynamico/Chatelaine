import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Config } from './config.js';
import type { Clock } from './lib/clock.js';
import type { Logger } from './lib/logger.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import {
  REQUEST_ID_HEADER,
  requestContext,
  SERVER_TIMING_HEADER,
} from './middleware/request-context.js';
import { simulation } from './middleware/simulation.js';
import type { Store } from './repositories/contracts.js';
import { authRoutes } from './routes/auth.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { meRoutes } from './routes/me.routes.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';

export const API_BASE_PATH = '/api';
/** Every body this API accepts is a small form; anything larger is a mistake or abuse. */
const JSON_BODY_LIMIT = '10kb';
const EXPOSED_HEADERS = [REQUEST_ID_HEADER, SERVER_TIMING_HEADER, 'Location'];

export interface AppDeps {
  readonly config: Config;
  readonly logger: Logger;
  readonly store: Store;
  readonly clock: Clock;
  readonly version: string;
}

/** The composition root: every service is built here from the store, config and clock. */
function createServices(deps: AppDeps) {
  const passwords = new PasswordService();
  const tokens = new TokenService(deps.config.jwt, deps.clock);
  const auth = new AuthService(deps.store.users, passwords, tokens, deps.clock);
  return { auth };
}

/**
 * Builds the Express app from its dependencies. main.ts calls it with real ones; tests
 * call it with a temp store and a silent logger, so nothing here reads globals.
 */
export function buildApp(deps: AppDeps): Express {
  const { config, logger, version } = deps;
  const services = createServices(deps);
  const app = express();

  app.set('trust proxy', config.trustProxy);
  app.use(requestContext(logger));
  app.use(helmet());
  app.use(cors({ origin: [...config.corsOrigins], exposedHeaders: EXPOSED_HEADERS }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = express.Router();
  // Health first: the boot check must measure the real server, never a simulated one.
  api.use(healthRoutes({ storage: config.storage.kind, version }));
  api.use(simulation({ enabled: config.simulationEnabled }));
  api.use(authRoutes(services.auth));
  api.use(meRoutes(services.auth));
  app.use(API_BASE_PATH, api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
