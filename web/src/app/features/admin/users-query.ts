import { SORT_ORDERS } from '../../core/models/paging';
import { ROLES, USER_SORT_FIELDS, USER_STATUSES, type UserListQuery } from '../../core/models/user';
import {
  type QueryValues,
  choice,
  optionalChoice,
  pageNumber,
  searchText,
} from '../../core/routing/url-query';

/** The API's limits (docs/API.md §8, §12), so nothing it would refuse is ever sent. */
const MAX_SEARCH_LENGTH = 60;
const MAX_PAGE = 100_000;
export const USERS_PAGE_SIZE = 10;
export const DEFAULT_USER_SORT = { sort: 'userId', order: 'asc' } as const;

/** The users table's state in the URL: `?q=&role=&status=&page=&sort=&order=` (§20). */
export const USERS_QUERY = {
  q: searchText(MAX_SEARCH_LENGTH),
  role: optionalChoice(ROLES),
  status: optionalChoice(USER_STATUSES),
  page: pageNumber(MAX_PAGE),
  sort: choice(USER_SORT_FIELDS, DEFAULT_USER_SORT.sort),
  order: choice(SORT_ORDERS, DEFAULT_USER_SORT.order),
} as const;

export type UsersUrlState = QueryValues<typeof USERS_QUERY>;

export function toUserListQuery(state: UsersUrlState): UserListQuery {
  return {
    page: state.page,
    pageSize: USERS_PAGE_SIZE,
    sort: state.sort,
    order: state.order,
    role: state.role,
    status: state.status,
    q: state.q,
  };
}

export function hasUserFilters(state: UsersUrlState): boolean {
  return [state.q, state.role, state.status].some((value) => value !== undefined);
}
