import type { Express } from 'express';
import request from 'supertest';
import type { Role } from '../../src/domain/user.js';
import { DEMO_PASSWORD } from './fixtures.js';

/** Signs in through the real login route and returns an Authorization header value. */
export async function bearerFor(app: Express, userId: string, role: Role): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ userId, password: DEMO_PASSWORD, role });
  if (res.status !== 200) {
    throw new Error(`Sign-in as ${userId} (${role}) failed with ${String(res.status)}`);
  }
  return `Bearer ${(res.body as { token: string }).token}`;
}
