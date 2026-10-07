import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { INTERNAL_ERROR_MESSAGE } from '../../src/domain/errors.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { requestContext } from '../../src/middleware/request-context.js';
import { expectErrorShape } from '../helpers/error-shape.js';
import { useTestContext, silentLogger } from '../helpers/test-app.js';

describe('error responses', () => {
  const context = useTestContext();

  it('answers an unknown route with 404 NOT_FOUND in the one error shape', async () => {
    const res = await request(context().app).get('/api/nothing-here').expect(404);
    expectErrorShape(res.body, 'NOT_FOUND');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['server-timing']).toBeDefined();
  });

  it('answers malformed JSON with 400 VALIDATION_FAILED', async () => {
    const res = await request(context().app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"userId":')
      .expect(400);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
  });

  it('answers an oversized body with 400 VALIDATION_FAILED', async () => {
    const res = await request(context().app)
      .post('/api/health')
      .send({ padding: 'x'.repeat(20_000) })
      .expect(400);
    expectErrorShape(res.body, 'VALIDATION_FAILED');
  });

  it('turns an unexpected error into a generic 500 with no internals', async () => {
    // The error middleware on its own, behind a route that throws something unplanned.
    const throwing = express()
      .use(requestContext(silentLogger))
      .get('/boom', () => {
        throw new Error('database password is hunter2');
      })
      .use(errorHandler);

    const res = await request(throwing).get('/boom').expect(500);
    expectErrorShape(res.body, 'INTERNAL');
    expect((res.body as { error: { message: string } }).error.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(res.text).not.toContain('hunter2');
    expect(res.text).not.toContain('Error:');
  });
});
