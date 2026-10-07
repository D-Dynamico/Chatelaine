import { userNotFound } from '../domain/errors.js';
import type { Page } from '../domain/paging.js';
import { toUserView, type UserListQuery, type UserView } from '../domain/user.js';
import type { RecordRepository, UserRepository } from '../repositories/contracts.js';

/** One user for the admin screens, with how many requests a delete would remove (§20). */
export interface UserDetailView extends UserView {
  readonly recordCount: number;
}

/** User management for admins (docs/API.md §12). Callers have already passed requireRole. */
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly records: RecordRepository,
  ) {}

  async list(query: UserListQuery): Promise<Page<UserView>> {
    const page = await this.users.list(query);
    return { ...page, items: page.items.map(toUserView) };
  }

  async get(userId: string): Promise<UserDetailView> {
    const user = await this.users.findById(userId);
    if (!user) throw userNotFound(userId);
    return { ...toUserView(user), recordCount: await this.records.countByOwner(userId) };
  }
}
