import { buildApp } from './app.js';
import { ConfigError, loadConfig, type Config } from './config.js';
import { createLogger } from './lib/logger.js';
import { loadEnvFileIfPresent, readPackageVersion } from './lib/runtime.js';

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

function start(): void {
  const config = readConfigOrExit();
  const logger = createLogger(config);
  const app = buildApp({ config, logger, version: readPackageVersion() });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, storage: config.storage.kind }, 'API listening');
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start();
