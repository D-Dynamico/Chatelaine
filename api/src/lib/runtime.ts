import { existsSync, readFileSync } from 'node:fs';

const ENV_FILE = '.env';

/**
 * Loads api/.env into process.env when it exists, using Node's built-in loader. Variables
 * already set (by Render, or on the command line) win, as they should.
 */
export function loadEnvFileIfPresent(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}

/** The package version, reported by /health. Read at runtime so src/ and dist/ agree. */
export function readPackageVersion(): string {
  const raw: unknown = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  if (typeof raw === 'object' && raw !== null && 'version' in raw) {
    return String(raw.version);
  }
  return 'unknown';
}
