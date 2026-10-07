import { buildApp } from './app.js';
import { ConfigError, loadConfig, type Config } from './config.js';
import { systemClock } from './lib/clock.js';
import { createLogger } from './lib/logger.js';
import { loadEnvFileIfPresent, readPackageVersion } from './lib/runtime.js';
import { createStore } from './repositories/create-store.js';

function readConfigOrExit(): Config {
  try {
    loadEnvFileIfPresent();
    return loadConfig(process.env);
  } catch (error) {
    // No logger exists yet, and a config failure must still be readable on any host.
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

async function start(): Promise<void> {
  const config = readConfigOrExit();
  const logger = createLogger(config);
  const store = createStore(config.storage);
  await store.init();
  const app = buildApp({
    config,
    logger,
    store,
    clock: systemClock,
    version: readPackageVersion(),
  });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, storage: config.storage.kind }, 'API listening');
  });

  // Finish in-flight requests, then let the store flush its last write before exiting.
  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void store.close().then(() => process.exit(0));
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

await start();
