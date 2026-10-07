import type { Role, UserStatus } from '../domain/user.js';

/** Shown on the login page and in the README; demo data only (docs/ARCHITECTURE.md §5). */
export const DEMO_PASSWORD = 'Chatelaine@2026';

const EMAIL_DOMAIN = 'chatelaine.test';

interface DemoUser {
  readonly userId: string;
  readonly displayName: string;
  readonly department: string;
  readonly role: Role;
  readonly status: UserStatus;
  readonly createdAt: string;
}

/**
 * The six accounts in docs/ARCHITECTURE.md §5, where each one's purpose is listed. Values
 * are fixed, timestamps included, so every seed run and every screenshot match.
 */
export const DEMO_USERS: readonly DemoUser[] = [
  {
    userId: 'meera.admin',
    displayName: 'Meera Nair',
    department: 'IT',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-08-03T09:00:00.000Z',
  },
  {
    userId: 'vikram.admin',
    displayName: 'Vikram Menon',
    department: 'IT',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-08-10T09:00:00.000Z',
  },
  {
    userId: 'riya',
    displayName: 'Riya Sharma',
    department: 'Finance',
    role: 'GENERAL',
    status: 'ACTIVE',
    createdAt: '2026-09-01T09:00:00.000Z',
  },
  {
    userId: 'arjun',
    displayName: 'Arjun Rao',
    department: 'Operations',
    role: 'GENERAL',
    status: 'ACTIVE',
    createdAt: '2026-09-08T09:00:00.000Z',
  },
  {
    userId: 'sara',
    displayName: 'Sara Khan',
    department: 'Design',
    role: 'GENERAL',
    status: 'ACTIVE',
    createdAt: '2026-09-15T09:00:00.000Z',
  },
  {
    userId: 'kabir',
    displayName: 'Kabir Singh',
    department: 'Sales',
    role: 'GENERAL',
    status: 'DISABLED',
    createdAt: '2026-09-03T09:00:00.000Z',
  },
];

export function demoEmail(userId: string): string {
  return `${userId}@${EMAIL_DOMAIN}`;
}
