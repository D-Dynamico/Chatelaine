import type { Store } from '../repositories/contracts.js';
import type { PasswordService } from '../services/password.service.js';
import { generateDemoRequests } from './demo-requests.js';
import { DEMO_PASSWORD, DEMO_USERS, demoEmail } from './demo-users.js';

export interface SeedResult {
  readonly users: number;
  readonly requests: number;
}

/**
 * Replaces everything in the store with the demo data. Resetting first is what makes it
 * idempotent: running it twice leaves exactly the same accounts and requests.
 */
export async function seedDemoData(store: Store, passwords: PasswordService): Promise<SeedResult> {
  await store.reset();
  for (const demo of DEMO_USERS) {
    await store.users.create({
      userId: demo.userId,
      displayName: demo.displayName,
      email: demoEmail(demo.userId),
      department: demo.department,
      role: demo.role,
      status: demo.status,
      // Each user gets its own salt, so equal demo passwords still hash differently.
      passwordHash: await passwords.hash(DEMO_PASSWORD),
      createdAt: demo.createdAt,
      updatedAt: demo.createdAt,
      lastLoginAt: null,
      previousLoginAt: null,
    });
  }
  const requests = generateDemoRequests();
  await store.records.insertMany(requests);
  return { users: DEMO_USERS.length, requests: requests.length };
}
