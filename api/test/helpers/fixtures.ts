import type { NewUser } from '../../src/domain/user.js';

export const T0 = '2026-09-01T09:00:00.000Z';
export const T1 = '2026-10-07T12:00:00.000Z';

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
