import { Writable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createLogger } from '../../src/lib/logger.js';
import { testConfig, TEST_VERSION } from '../helpers/test-app.js';

function captureLogs(): { stream: Writable; text: () => string } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      chunks.push(chunk.toString());
      done();
    },
  });
  return { stream, text: () => chunks.join('') };
}

describe('request logging', () => {
  it('logs each request with its ID but never the bearer token', async () => {
    const logs = captureLogs();
    const logger = createLogger({ env: 'test', logLevel: 'info' }, logs.stream);
    const app = buildApp({ config: testConfig(), logger, version: TEST_VERSION });

    const res = await request(app)
      .get('/api/health')
      .set('Authorization', 'Bearer secret-token-value');

    const output = logs.text();
    expect(output).toContain(String(res.headers['x-request-id']));
    expect(output).toContain('[redacted]');
    expect(output).not.toContain('secret-token-value');
  });
});
