import type { Store } from '../repositories/contracts.js';
import type { PasswordService } from '../services/password.service.js';
import { DEMO_PASSWORD, DEMO_USERS, demoEmail } from './demo-users.js';

/**
 * Replaces everything in the store with the demo users. Resetting first is what makes it
 * idempotent: running it twice leaves exactly the same accounts. Returns the user count.
 */
export async function seedUsers(store: Store, passwords: PasswordService): Promise<number> {
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
    });
  }
  return DEMO_USERS.length;
}
