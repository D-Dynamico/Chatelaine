import { pino } from 'pino';
import { buildApp } from '../../src/app.js';
import { loadConfig, type Config } from '../../src/config.js';

export const TEST_ORIGIN = 'http://localhost:4200';
export const TEST_VERSION = '0.0.0-test';

export function testConfig(env: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-long-enough-for-the-config-check',
    CORS_ORIGIN: TEST_ORIGIN,
    ...env,
  });
}

export const silentLogger = pino({ level: 'silent' });

export function buildTestApp(env: Record<string, string> = {}) {
  return buildApp({ config: testConfig(env), logger: silentLogger, version: TEST_VERSION });
}
