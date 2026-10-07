import bcrypt from 'bcryptjs';
import type { NewUser } from '../../src/domain/user.js';

export const T0 = '2026-09-01T09:00:00.000Z';
export const T1 = '2026-10-07T12:00:00.000Z';

export const DEMO_PASSWORD = 'Chatelaine@2026';
/** Cost 4 keeps tests fast; bcrypt reads the cost from the hash, so login runs as usual. */
export const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 4);

/** One of each case login has to tell apart: a General User, an admin, a disabled user. */
export function signInUsers(): NewUser[] {
  return [
    aUser({ passwordHash: DEMO_PASSWORD_HASH }),
    aUser({
      userId: 'meera.admin',
      displayName: 'Meera Nair',
      email: 'meera.admin@chatelaine.test',
      department: 'IT',
      role: 'ADMIN',
      passwordHash: DEMO_PASSWORD_HASH,
    }),
    aUser({
      userId: 'kabir',
      displayName: 'Kabir Singh',
      email: 'kabir@chatelaine.test',
      department: 'Sales',
      status: 'DISABLED',
      passwordHash: DEMO_PASSWORD_HASH,
    }),
  ];
}

/** A stored user with sensible defaults; tests override only what they are about. */
export function aUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    userId: 'riya',
    displayName: 'Riya Sharma',
    email: 'riya@chatelaine.test',
    department: 'Finance',
    role: 'GENERAL',
    status: 'ACTIVE',
    passwordHash: 'stored-hash-for-riya',
    createdAt: T0,
    updatedAt: T0,
    lastLoginAt: null,
    ...overrides,
  };
}
