import { Subject, firstValueFrom, of, switchMap, throwError, toArray } from 'rxjs';
import { type LoadState, keepDataWhileRefreshing, toLoadState } from './load-state';

const failure = { status: 503, code: 'SIMULATED_FAILURE', message: 'Simulated failure.' };

describe('toLoadState', () => {
  it('emits loading, then loaded', async () => {
    const states = await firstValueFrom(of([1, 2]).pipe(toLoadState(), toArray()));

    expect(states).toEqual([
      { status: 'loading' },
      { status: 'loaded', data: [1, 2], isRefreshing: false },
    ]);
  });

  it('emits empty when the predicate says so', async () => {
    const states = await firstValueFrom(
      of<number[]>([]).pipe(
        toLoadState((list) => list.length === 0),
        toArray(),
      ),
    );

    expect(states.at(-1)).toEqual({ status: 'empty', isRefreshing: false });
  });

  it('turns a failure into an error state and completes', async () => {
    const states = await firstValueFrom(throwError(() => failure).pipe(toLoadState(), toArray()));

    expect(states).toEqual([{ status: 'loading' }, { status: 'error', error: failure }]);
  });

  it('describes an error that is not an API failure in plain words', async () => {
    const states = await firstValueFrom(
      throwError(() => new TypeError('x is undefined')).pipe(toLoadState(), toArray()),
    );

    expect(states.at(-1)).toMatchObject({ status: 'error', error: { code: 'UNKNOWN' } });
  });
});

describe('keepDataWhileRefreshing', () => {
  /** Each value is one request's outcome, run through the same pipeline a panel uses. */
  function panel(outcomes: Subject<'data' | 'none' | 'fail'>) {
    const seen: LoadState<string>[] = [];
    outcomes
      .pipe(
        switchMap((outcome) => {
          const request = outcome === 'fail' ? throwError(() => failure) : of(outcome);
          return request.pipe(toLoadState((data) => data === 'none'));
        }),
        keepDataWhileRefreshing(),
      )
      .subscribe((state) => seen.push(state));
    return seen;
  }

  it('shows the skeleton only before the first result', () => {
    const outcomes = new Subject<'data' | 'none' | 'fail'>();
    const seen = panel(outcomes);

    outcomes.next('data');
    outcomes.next('data');

    expect(seen.map((state) => state.status)).toEqual(['loading', 'loaded', 'loaded', 'loaded']);
    expect(seen[2]).toEqual({ status: 'loaded', data: 'data', isRefreshing: true });
    expect(seen[3]).toEqual({ status: 'loaded', data: 'data', isRefreshing: false });
  });

  it('keeps an empty result on screen while refreshing it', () => {
    const outcomes = new Subject<'data' | 'none' | 'fail'>();
    const seen = panel(outcomes);

    outcomes.next('none');
    outcomes.next('data');

    expect(seen[2]).toEqual({ status: 'empty', isRefreshing: true });
  });

  it('replaces the rows with the error when a refresh fails, then loads fresh', () => {
    const outcomes = new Subject<'data' | 'none' | 'fail'>();
    const seen = panel(outcomes);

    outcomes.next('data');
    outcomes.next('fail');
    outcomes.next('data');

    expect(seen.map((state) => state.status)).toEqual([
      'loading',
      'loaded',
      'loaded',
      'error',
      'loading',
      'loaded',
    ]);
  });
});
