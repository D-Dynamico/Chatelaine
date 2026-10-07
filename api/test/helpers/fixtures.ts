import bcrypt from 'bcryptjs';
import type { ServiceRequest } from '../../src/domain/service-request.js';
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

export function aRequest(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'SR-1001',
    ownerId: 'riya',
    title: 'Laptop battery swells after charging',
    category: 'HARDWARE',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    accessLevel: 'GENERAL',
    assignee: 'Vikram Menon',
    internalNote: null,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}T09:00:00.000Z`;

/**
 * Eight requests chosen so every query rule has something to bite on: Riya owns an
 * Admin-level one, SR-1001 and SR-1008 share a createdAt (tie-break), one title is
 * lower-case (binary sort), and one contains regex metacharacters (search escaping).
 */
export function requestSet(): ServiceRequest[] {
  const r = (id: number, fields: Partial<ServiceRequest>) =>
    aRequest({ id: `SR-${String(id)}`, ...fields });
  return [
    r(1001, {
      ownerId: 'riya',
      title: 'Laptop battery swells',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: day(1),
      updatedAt: day(5),
    }),
    r(1002, {
      ownerId: 'riya',
      title: 'Suspicious login on finance mailbox',
      category: 'ACCESS',
      priority: 'CRITICAL',
      status: 'OPEN',
      accessLevel: 'ADMIN',
      internalNote: 'Possible phishing; keep private',
      createdAt: day(2),
      updatedAt: day(2),
    }),
    r(1003, {
      ownerId: 'riya',
      title: 'monitor flickers at low brightness',
      priority: 'LOW',
      status: 'CLOSED',
      assignee: null,
      createdAt: day(3),
      updatedAt: day(20),
    }),
    r(1004, {
      ownerId: 'arjun',
      title: 'VPN drops on train wifi',
      category: 'NETWORK',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      createdAt: day(4),
      updatedAt: day(6),
    }),
    r(1005, {
      ownerId: 'arjun',
      title: 'Access review for payroll',
      category: 'ACCESS',
      priority: 'HIGH',
      status: 'OPEN',
      accessLevel: 'ADMIN',
      createdAt: day(5),
      updatedAt: day(7),
    }),
    r(1006, {
      ownerId: 'meera.admin',
      title: 'Server room badge reader (east) offline',
      category: 'FACILITIES',
      priority: 'CRITICAL',
      status: 'OPEN',
      createdAt: day(6),
      updatedAt: day(10),
    }),
    r(1007, {
      ownerId: 'riya',
      title: 'Laptop docking station',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignee: null,
      createdAt: day(7),
      updatedAt: day(8),
    }),
    r(1008, {
      ownerId: 'kabir',
      title: 'Printer jam on floor 3',
      priority: 'HIGH',
      status: 'CLOSED',
      createdAt: day(1),
      updatedAt: day(3),
    }),
  ];
}
