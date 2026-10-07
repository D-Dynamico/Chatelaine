import { loadConfig } from '../config.js';
import { createLogger } from '../lib/logger.js';
import { loadEnvFileIfPresent } from '../lib/runtime.js';
import { createStore } from '../repositories/create-store.js';
import { PasswordService } from '../services/password.service.js';
import { seedUsers } from './seed-users.js';

/** `npm run seed`: resets the store STORAGE selects and writes the demo data into it. */
async function runSeed(): Promise<void> {
  loadEnvFileIfPresent();
  const config = loadConfig(process.env);
  const logger = createLogger(config);
  const store = createStore(config.storage);
  await store.init();
  try {
    const users = await seedUsers(store, new PasswordService());
    logger.info({ storage: config.storage.kind, users }, 'seeded demo data');
  } finally {
    await store.close();
  }
}

try {
  await runSeed();
} catch (error) {
  // The logger may not exist yet (bad config), so failures go straight to stderr.
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exitCode = 1;
}
