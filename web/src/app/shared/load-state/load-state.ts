import { type Observable, type OperatorFunction, catchError, map, of, scan, startWith } from 'rxjs';

/**
 * What an error state needs to show. `ApiError` fits it; `shared/` cannot import `core/`,
 * so the shape is declared here instead.
 */
export interface LoadFailure {
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

/**
 * The one type every async view switches over (§18, D22). `isRefreshing` marks data still
 * on screen while a newer request runs, so paging or a retry shows a progress line rather
 * than the skeleton; it exists on `empty` too, so refreshing an empty result does not
 * flash the skeleton either.
 */
export type LoadState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly data: T; readonly isRefreshing: boolean }
  | { readonly status: 'empty'; readonly isRefreshing: boolean }
  | { readonly status: 'error'; readonly error: LoadFailure };

const UNKNOWN_FAILURE: LoadFailure = {
  status: 0,
  code: 'UNKNOWN',
  message: 'Something unexpected stopped this from loading. Try again.',
};

function isLoadFailure(error: unknown): error is LoadFailure {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/**
 * Turns one request into its load states: `loading`, then `loaded` or `empty`, or `error`.
 * Errors become a state, so the stream completes normally and a retry can follow.
 */
export function toLoadState<T>(isEmpty: (data: T) => boolean = () => false) {
  return (source: Observable<T>): Observable<LoadState<T>> =>
    source.pipe(
      map((data): LoadState<T> =>
        isEmpty(data)
          ? { status: 'empty', isRefreshing: false }
          : { status: 'loaded', data, isRefreshing: false },
      ),
      catchError((error: unknown) =>
        of<LoadState<T>>({
          status: 'error',
          error: isLoadFailure(error) ? error : UNKNOWN_FAILURE,
        }),
      ),
      startWith<LoadState<T>>({ status: 'loading' }),
    );
}

/**
 * Across successive requests: a new `loading` keeps what is on screen, marked as
 * refreshing, when there is something to keep. After an error there is not, because rows
 * that no longer match the request must not stay up looking current; the next load shows
 * the skeleton.
 */
export function keepDataWhileRefreshing<T>(): OperatorFunction<LoadState<T>, LoadState<T>> {
  return scan<LoadState<T>, LoadState<T>, null>((shown, next) => {
    if (next.status !== 'loading' || shown === null) return next;
    if (shown.status === 'loaded' || shown.status === 'empty') {
      return { ...shown, isRefreshing: true };
    }
    return next;
  }, null);
}
