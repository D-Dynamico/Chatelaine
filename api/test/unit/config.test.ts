import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config.js';

const SECRET = 'a-test-secret-that-is-long-enough-to-pass';

const minimalEnv = {
  JWT_SECRET: SECRET,
  CORS_ORIGIN: 'http://localhost:4200',
};

function configError(env: Record<string, string>): string {
  try {
    loadConfig(env);
  } catch (error) {
    if (error instanceof ConfigError) return error.message;
    throw error;
  }
  throw new Error('expected loadConfig to throw a ConfigError');
}

describe('loadConfig', () => {
  it('applies the documented defaults to a minimal environment', () => {
    expect(loadConfig(minimalEnv)).toEqual({
      port: 3000,
      env: 'development',
      logLevel: 'info',
      storage: { kind: 'file', dataFile: 'data/chatelaine.xml' },
      jwt: { secret: SECRET, ttlSeconds: 7200 },
      corsOrigins: ['http://localhost:4200'],
      trustProxy: false,
      simulationEnabled: true,
    });
  });

  it('treats KEY= as unset, as a .env file means it', () => {
    const config = loadConfig({ ...minimalEnv, TRUST_PROXY: '', PORT: '', JWT_TTL: '' });
    expect(config.trustProxy).toBe(false);
    expect(config.port).toBe(3000);
    expect(config.jwt.ttlSeconds).toBe(7200);
  });

  it('parses JWT_TTL units into seconds', () => {
    expect(loadConfig({ ...minimalEnv, JWT_TTL: '30m' }).jwt.ttlSeconds).toBe(1800);
    expect(loadConfig({ ...minimalEnv, JWT_TTL: '900s' }).jwt.ttlSeconds).toBe(900);
    expect(configError({ ...minimalEnv, JWT_TTL: '2 hours' })).toContain('JWT_TTL');
    expect(configError({ ...minimalEnv, JWT_TTL: '0h' })).toContain('JWT_TTL');
  });

  it('reads SIMULATION_ENABLED=false as false, not as a truthy string', () => {
    expect(loadConfig({ ...minimalEnv, SIMULATION_ENABLED: 'false' }).simulationEnabled).toBe(
      false,
    );
    expect(configError({ ...minimalEnv, SIMULATION_ENABLED: 'yes' })).toContain(
      'SIMULATION_ENABLED',
    );
  });

  it('splits and trims CORS_ORIGIN, rejecting anything that is not an http(s) URL', () => {
    const config = loadConfig({
      ...minimalEnv,
      CORS_ORIGIN: 'http://localhost:4200, https://chatelaine.example',
    });
    expect(config.corsOrigins).toEqual(['http://localhost:4200', 'https://chatelaine.example']);
    expect(configError({ ...minimalEnv, CORS_ORIGIN: 'localhost:4200' })).toContain('CORS_ORIGIN');
    expect(configError({ ...minimalEnv, CORS_ORIGIN: 'ftp://files.example' })).toContain(
      'CORS_ORIGIN',
    );
  });

  it('reads TRUST_PROXY as a hop count', () => {
    expect(loadConfig({ ...minimalEnv, TRUST_PROXY: '1' }).trustProxy).toBe(1);
    expect(configError({ ...minimalEnv, TRUST_PROXY: 'true' })).toContain('TRUST_PROXY');
  });

  it('requires the settings of the storage it selects', () => {
    expect(configError({ ...minimalEnv, STORAGE: 'mongo' })).toContain('MONGO_URI');
    expect(configError({ ...minimalEnv, STORAGE: 'dynamo' })).toContain('DYNAMO_REGION');
    expect(
      loadConfig({ ...minimalEnv, STORAGE: 'mongo', MONGO_URI: 'mongodb://localhost:27017' })
        .storage,
    ).toEqual({ kind: 'mongo', uri: 'mongodb://localhost:27017', dbName: 'chatelaine' });
  });

  it('rejects a short JWT secret, and the placeholder secret only in production', () => {
    expect(configError({ ...minimalEnv, JWT_SECRET: 'short' })).toContain('JWT_SECRET');
    const placeholder = { ...minimalEnv, JWT_SECRET: 'replace-with-a-long-random-string' };
    expect(loadConfig(placeholder).jwt.secret).toBe('replace-with-a-long-random-string');
    expect(configError({ ...placeholder, NODE_ENV: 'production' })).toContain('JWT_SECRET');
  });

  it('lists every problem at once, so a broken deploy is fixed in one pass', () => {
    const message = configError({ PORT: 'eighty' });
    expect(message).toContain('PORT');
    expect(message).toContain('JWT_SECRET');
    expect(message).toContain('CORS_ORIGIN');
  });
});
