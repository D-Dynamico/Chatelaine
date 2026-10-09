import {
  ACCESS_LEVELS,
  PRIORITIES,
  RECORD_SORT_FIELDS,
  REQUEST_STATUSES,
  type RecordQuery,
} from '../../core/models/service-request';
import { SORT_ORDERS } from '../../core/models/paging';
import {
  type QueryValues,
  choice,
  optionalChoice,
  pageNumber,
  searchText,
} from '../../core/routing/url-query';

/** The API's limits (docs/API.md §8, §11), so nothing it would refuse is ever sent. */
const MAX_SEARCH_LENGTH = 60;
const MAX_PAGE = 100_000;
export const RECORDS_PAGE_SIZE = 10;

/** The records table's state in the URL: `?q=&status=&priority=&access=&page=&sort=&order=`. */
export const RECORDS_QUERY = {
  q: searchText(MAX_SEARCH_LENGTH),
  status: optionalChoice(REQUEST_STATUSES),
  priority: optionalChoice(PRIORITIES),
  access: optionalChoice(ACCESS_LEVELS),
  page: pageNumber(MAX_PAGE),
  sort: choice(RECORD_SORT_FIELDS, 'createdAt'),
  order: choice(SORT_ORDERS, 'desc'),
} as const;

export type RecordsUrlState = QueryValues<typeof RECORDS_QUERY>;

/**
 * The API query for what the URL asks. `access` is an Admin filter: a General User who
 * opens an admin's shared link would get a 403 for it (§11), so it is dropped for them
 * here, before any request.
 */
export function toRecordQuery(state: RecordsUrlState, isAdmin: boolean): RecordQuery {
  return {
    page: state.page,
    pageSize: RECORDS_PAGE_SIZE,
    sort: state.sort,
    order: state.order,
    status: state.status,
    priority: state.priority,
    accessLevel: isAdmin ? state.access : undefined,
    q: state.q,
  };
}

export function hasFilters(state: RecordsUrlState, isAdmin: boolean): boolean {
  const query = toRecordQuery(state, isAdmin);
  return [query.q, query.status, query.priority, query.accessLevel].some(
    (value) => value !== undefined,
  );
}
