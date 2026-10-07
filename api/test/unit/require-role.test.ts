import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Role } from '../../src/domain/user.js';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { requestContext } from '../../src/middleware/request-context.js';
import { requireRole } from '../../src/middleware/require-role.js';
import { expectErrorShape } from '../helpers/error-shape.js';
import { aUser } from '../helpers/fixtures.js';
import { silentLogger } from '../helpers/test-app.js';

// No admin route exists until Stage 2, so the middleware is tested on a stand-in route,
// behind a stub that plays the part of authenticate.
function appFor(role: Role | null) {
  const signedInAs: RequestHandler = (req, _res, next) => {
    if (role) req.auth = { user: aUser({ role }) };
    next();
  };
  return express()
    .use(requestContext(silentLogger))
    .get('/admin-only', signedInAs, requireRole('ADMIN'), (_req, res) => {
      res.json({ ok: true });
    })
    .use(errorHandler);
}

describe('requireRole', () => {
  it('refuses a General User with 403 FORBIDDEN', async () => {
    const res = await request(appFor('GENERAL')).get('/admin-only').expect(403);
    expectErrorShape(res.body, 'FORBIDDEN');
  });

  it('lets an admin through', async () => {
    const res = await request(appFor('ADMIN')).get('/admin-only').expect(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('fails closed with 401 when authenticate did not run first', async () => {
    const res = await request(appFor(null)).get('/admin-only').expect(401);
    expectErrorShape(res.body, 'UNAUTHENTICATED');
  });
});
