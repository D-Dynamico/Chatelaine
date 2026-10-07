import { ForbiddenError } from '../domain/errors.js';
import type { Page } from '../domain/paging.js';
import type {
  AccessLevel,
  RecordListQuery,
  RecordScope,
  ServiceRequest,
} from '../domain/service-request.js';
import type { User } from '../domain/user.js';
import type { RecordRepository, UserRepository } from '../repositories/contracts.js';

/** What a General User may see of a request. Restricted keys are absent, not null. */
export interface GeneralRecordView {
  readonly id: string;
  readonly title: string;
  readonly category: ServiceRequest['category'];
  readonly priority: ServiceRequest['priority'];
  readonly status: ServiceRequest['status'];
  readonly accessLevel: AccessLevel;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminRecordView extends GeneralRecordView {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly assignee: string | null;
  readonly internalNote: string | null;
}

export interface RecordSummaryView {
  readonly scope: 'OWN' | 'ALL';
  readonly total: number;
  readonly byStatus: Record<ServiceRequest['status'], number>;
  readonly byPriority: Record<ServiceRequest['priority'], number>;
  readonly byAccessLevel: Partial<Record<AccessLevel, number>>;
}

function seesEverything(viewer: User): boolean {
  return viewer.role === 'ADMIN';
}

/**
 * The visibility rule (docs/ARCHITECTURE.md §5). A General User's scope is their own
 * GENERAL-level requests; it is handed to the repository so the filter runs in the query.
 */
function scopeFor(viewer: User): RecordScope {
  return seesEverything(viewer) ? {} : { ownerId: viewer.userId, accessLevel: 'GENERAL' };
}

/** Built field by field, so a restricted key cannot survive by accident. */
function toGeneralView(item: ServiceRequest): GeneralRecordView {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    priority: item.priority,
    status: item.status,
    accessLevel: item.accessLevel,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export class RecordService {
  constructor(
    private readonly records: RecordRepository,
    private readonly users: UserRepository,
  ) {}

  async list(
    viewer: User,
    query: RecordListQuery,
  ): Promise<Page<GeneralRecordView | AdminRecordView>> {
    // Filtering by access level would itself reveal that Admin-level requests exist.
    if (!seesEverything(viewer) && query.accessLevel !== undefined) throw new ForbiddenError();
    const page = await this.records.list(scopeFor(viewer), query);
    const items = seesEverything(viewer)
      ? await this.toAdminViews(page.items)
      : page.items.map(toGeneralView);
    return { ...page, items };
  }

  async summary(viewer: User): Promise<RecordSummaryView> {
    const counts = await this.records.summary(scopeFor(viewer));
    return {
      scope: seesEverything(viewer) ? 'ALL' : 'OWN',
      total: counts.total,
      byStatus: counts.byStatus,
      byPriority: counts.byPriority,
      // A General User's summary has no ADMIN key at all, not even a zero.
      byAccessLevel: seesEverything(viewer)
        ? counts.byAccessLevel
        : { GENERAL: counts.byAccessLevel.GENERAL },
    };
  }

  /** Adds each owner's display name, so the admin table never shows a bare user ID. */
  private async toAdminViews(items: readonly ServiceRequest[]): Promise<AdminRecordView[]> {
    const ownerIds = [...new Set(items.map((item) => item.ownerId))];
    const owners = await Promise.all(ownerIds.map((id) => this.users.findById(id)));
    const names = new Map(
      owners.flatMap((owner) => (owner ? [[owner.userId, owner.displayName]] : [])),
    );
    return items.map((item) => ({
      ...toGeneralView(item),
      ownerId: item.ownerId,
      // Deleting a user deletes their requests (D15), so a missing owner means a data fault.
      ownerName: names.get(item.ownerId) ?? item.ownerId,
      assignee: item.assignee,
      internalNote: item.internalNote,
    }));
  }
}
