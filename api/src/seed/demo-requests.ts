import type {
  AccessLevel,
  Priority,
  RequestStatus,
  ServiceRequest,
} from '../domain/service-request.js';
import { seededRandom, type Random } from './random.js';
import {
  ADMIN_NOTES,
  ADMIN_TEMPLATES,
  ASSIGNEES,
  GENERAL_NOTES,
  GENERAL_TEMPLATES,
  type RequestTemplate,
} from './request-catalogue.js';

export const DEMO_SEED = 2026;
/** The demo's "today": every request was raised and last updated before it. */
export const DEMO_ANCHOR = '2026-10-07T09:00:00.000Z';

const FIRST_ID = 1001;
const MAX_AGE_DAYS = 75;
const WORKDAY_START_HOUR = 8;
const WORKDAY_MINUTES = 9 * 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/**
 * How many requests each account owns and how many of those are Admin-level. Fixed rather
 * than random, so the seed always shows what ARCHITECTURE §5 promises: Riya has hidden
 * Admin-level requests, Arjun has few, Sara has none, and about one in five is Admin-level.
 */
const OWNERSHIP: readonly { ownerId: string; total: number; adminLevel: number }[] = [
  { ownerId: 'riya', total: 22, adminLevel: 5 },
  { ownerId: 'arjun', total: 7, adminLevel: 1 },
  { ownerId: 'meera.admin', total: 10, adminLevel: 2 },
  { ownerId: 'vikram.admin', total: 10, adminLevel: 2 },
  { ownerId: 'kabir', total: 11, adminLevel: 2 },
];

const PRIORITY_WEIGHTS: Record<AccessLevel, Readonly<Record<Priority, number>>> = {
  GENERAL: { LOW: 25, MEDIUM: 40, HIGH: 25, CRITICAL: 10 },
  ADMIN: { LOW: 5, MEDIUM: 25, HIGH: 40, CRITICAL: 30 },
};
const STATUS_WEIGHTS: Readonly<Record<RequestStatus, number>> = {
  OPEN: 30,
  IN_PROGRESS: 25,
  RESOLVED: 25,
  CLOSED: 20,
};

type Draft = Omit<ServiceRequest, 'id'>;

function raisedAt(random: Random): Date {
  const day = new Date(Date.parse(DEMO_ANCHOR) - random.int(1, MAX_AGE_DAYS) * MS_PER_DAY);
  day.setUTCHours(WORKDAY_START_HOUR, 0, 0, 0);
  return new Date(day.getTime() + random.int(0, WORKDAY_MINUTES) * MS_PER_MINUTE);
}

function draftRequest(
  random: Random,
  ownerId: string,
  accessLevel: AccessLevel,
  template: RequestTemplate,
): Draft {
  const created = raisedAt(random);
  const status = random.weighted(STATUS_WEIGHTS);
  const untilAnchor = Date.parse(DEMO_ANCHOR) - created.getTime();
  const updated =
    status === 'OPEN' ? created : new Date(created.getTime() + random.next() * untilAnchor);
  const isAssigned = status !== 'OPEN' || random.chance(0.5);
  const hasNote = accessLevel === 'ADMIN' || random.chance(0.3);
  return {
    ownerId,
    title: template.title,
    category: template.category,
    priority: random.weighted(PRIORITY_WEIGHTS[accessLevel]),
    status,
    accessLevel,
    assignee: isAssigned ? random.pick(ASSIGNEES) : null,
    internalNote: hasNote
      ? random.pick(accessLevel === 'ADMIN' ? ADMIN_NOTES : GENERAL_NOTES)
      : null,
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
  };
}

function draftsFor(random: Random, owner: (typeof OWNERSHIP)[number]): Draft[] {
  // Shuffled without replacement, so one person never raises the same request twice.
  const adminTitles = random.shuffle(ADMIN_TEMPLATES).slice(0, owner.adminLevel);
  const generalTitles = random.shuffle(GENERAL_TEMPLATES).slice(0, owner.total - owner.adminLevel);
  return [
    ...adminTitles.map((template) => draftRequest(random, owner.ownerId, 'ADMIN', template)),
    ...generalTitles.map((template) => draftRequest(random, owner.ownerId, 'GENERAL', template)),
  ];
}

/** The same 60 requests on every call, with ids SR-1001 upward in the order they were raised. */
export function generateDemoRequests(seed: number = DEMO_SEED): ServiceRequest[] {
  const random = seededRandom(seed);
  return OWNERSHIP.flatMap((owner) => draftsFor(random, owner))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.ownerId.localeCompare(b.ownerId))
    .map((draft, index) => ({ id: `SR-${String(FIRST_ID + index)}`, ...draft }));
}
