import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type UrlQuery,
  choice,
  injectUrlQuery,
  optionalChoice,
  pageNumber,
  searchText,
} from './url-query';

const SHAPE = {
  q: searchText(10),
  colour: optionalChoice(['RED', 'BLUE']),
  page: pageNumber(50),
  order: choice(['asc', 'desc'], 'desc'),
};

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class ListPage {
  readonly query: UrlQuery<typeof SHAPE> = injectUrlQuery(SHAPE, 'page');
}

async function openAt(url: string) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: 'list', component: ListPage }])],
  });
  const harness = await RouterTestingHarness.create();
  const page = await harness.navigateByUrl(url, ListPage);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate');
  const settle = () => harness.fixture.whenStable();
  return { query: page.query, router, navigate, settle };
}

describe('injectUrlQuery', () => {
  it('reads the URL into valid values', async () => {
    const { query } = await openAt('/list?q=keys&colour=GREEN&page=4&order=asc');

    expect(query.values()).toEqual({ q: 'keys', colour: undefined, page: 4, order: 'asc' });
  });

  it('goes back to page 1 when a filter changes, and keeps the page when paging', async () => {
    const { query, router, settle } = await openAt('/list?page=4');

    query.update({ colour: 'RED' });
    await settle();
    expect(router.url).toBe('/list?colour=RED');

    query.update({ page: 3 });
    await settle();
    expect(router.url).toBe('/list?colour=RED&page=3');
  });

  it('replaces the history entry while typing, and adds one otherwise', async () => {
    const { query, navigate } = await openAt('/list');

    query.update({ q: 'lap' }, { isTyping: true });
    query.update({ order: 'asc' });

    expect(navigate.mock.calls[0]?.[1]).toMatchObject({ replaceUrl: true });
    expect(navigate.mock.calls[1]?.[1]).toMatchObject({ replaceUrl: false });
  });

  it('drops invalid and unknown params from the URL on the next change', async () => {
    const { query, router, settle } = await openAt('/list?colour=GREEN&stray=1&page=x');

    query.update({ order: 'asc' });
    await settle();

    expect(router.url).toBe('/list?order=asc');
  });
});
