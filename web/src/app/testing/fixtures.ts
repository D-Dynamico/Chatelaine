import { type UserView } from '../core/models/user';

/** Test data shaped like the seed users (docs/ARCHITECTURE.md §5). */

export const TEST_API_BASE = 'http://api.test/api';

export const RIYA: UserView = {
  userId: 'riya',
  displayName: 'Riya Sharma',
  email: 'riya@chatelaine.test',
  department: 'Finance',
  role: 'GENERAL',
  status: 'ACTIVE',
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  lastLoginAt: '2026-10-07T13:02:11.000Z',
};

export const MEERA: UserView = {
  ...RIYA,
  userId: 'meera.admin',
  displayName: 'Meera Nair',
  email: 'meera@chatelaine.test',
  department: 'IT',
  role: 'ADMIN',
};

export function errorBody(
  code: string,
  message = `${code} message`,
): { error: { code: string; message: string } } {
  return { error: { code, message } };
}
