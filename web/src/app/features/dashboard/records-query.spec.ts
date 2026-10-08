import { convertToParamMap } from '@angular/router';
import { readQuery } from '../../core/routing/url-query';
import { RECORDS_QUERY, hasFilters, toRecordQuery } from './records-query';

const read = (params: Record<string, string>) =>
  readQuery(RECORDS_QUERY, convertToParamMap(params));

describe('records query', () => {
  it('reads a valid URL as given', () => {
    const state = read({
      q: ' laptop ',
      status: 'OPEN',
      priority: 'HIGH',
      access: 'ADMIN',
      page: '3',
      sort: 'priority',
      order: 'asc',
    });

    expect(toRecordQuery(state, true)).toEqual({
      page: 3,
      pageSize: 10,
      sort: 'priority',
      order: 'asc',
      status: 'OPEN',
      priority: 'HIGH',
      accessLevel: 'ADMIN',
      q: 'laptop',
    });
  });

  it('falls back to the default for every unknown or invalid value', () => {
    const state = read({
      q: 'x'.repeat(61),
      status: 'open',
      priority: 'URGENT',
      access: 'ROOT',
      page: '-2',
      sort: 'ownerId',
      order: 'sideways',
    });

    expect(toRecordQuery(state, true)).toEqual({
      page: 1,
      pageSize: 10,
      sort: 'createdAt',
      order: 'desc',
      status: undefined,
      priority: undefined,
      accessLevel: undefined,
      q: undefined,
    });
  });

  it.each(['0', '1.5', '1e3', '100001', 'two', ''])('treats page=%s as page 1', (page) => {
    expect(read({ page }).page).toBe(1);
  });

  it('never sends access for a General User, so an admin link cannot cause a 403', () => {
    const state = read({ access: 'ADMIN', status: 'OPEN' });

    expect(toRecordQuery(state, false).accessLevel).toBeUndefined();
    expect(toRecordQuery(state, false).status).toBe('OPEN');
    expect(hasFilters(read({ access: 'ADMIN' }), false)).toBe(false);
    expect(hasFilters(read({ access: 'ADMIN' }), true)).toBe(true);
  });
});
