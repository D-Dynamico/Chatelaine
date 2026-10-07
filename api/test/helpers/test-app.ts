import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Express } from 'express';
import { pino, type Logger } from 'pino';
import { afterEach, beforeEach } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig, type Config } from '../../src/config.js';
import type { NewUser } from '../../src/domain/user.js';
import { fixedClock, type Clock } from '../../src/lib/clock.js';
import { FileStore } from '../../src/repositories/file/file-store.js';
import { T1 } from './fixtures.js';

export const TEST_ORIGIN = 'http://localhost:4200';
export const TEST_VERSION = '0.0.0-test';
/** "Now" in API tests unless a test says otherwise. */
export const TEST_NOW = T1;

export function testConfig(env: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-long-enough-for-the-config-check',
    CORS_ORIGIN: TEST_ORIGIN,
    ...env,
  });
}

export const silentLogger = pino({ level: 'silent' });

export interface TestContextOptions {
  readonly users?: readonly NewUser[];
  readonly env?: Record<string, string>;
  readonly clock?: Clock;
  readonly logger?: Logger;
}

export interface TestContext {
  readonly app: Express;
  readonly store: FileStore;
  readonly config: Config;
  cleanup(): Promise<void>;
}

/**
 * Gives every test its own app and store. Per test, not per suite: the login rate limit and
 * stored sign-in times are state, and a suite-wide app let one test's attempts leak into
 * the next. Returns a getter, because the context only exists once beforeEach has run.
 */
export function useTestContext(options: TestContextOptions = {}): () => TestContext {
  let context: TestContext | undefined;
  beforeEach(async () => {
    context = await createTestContext(options);
  });
  afterEach(async () => {
    await context?.cleanup();
  });
  return () => {
    if (!context) throw new Error('useTestContext: read the context inside a test, not at load');
    return context;
  };
}

/** A real app over a file store in a fresh temp folder, seeded with the given users. */
export async function createTestContext(options: TestContextOptions = {}): Promise<TestContext> {
  const dir = await mkdtemp(join(tmpdir(), 'chatelaine-api-'));
  const store = new FileStore(join(dir, 'chatelaine.xml'));
  await store.init();
  for (const user of options.users ?? []) await store.users.create(user);

  const config = testConfig(options.env);
  const app = buildApp({
    config,
    logger: options.logger ?? silentLogger,
    store,
    clock: options.clock ?? fixedClock(TEST_NOW),
    version: TEST_VERSION,
  });
  return {
    app,
    store,
    config,
    cleanup: async () => {
      await store.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
