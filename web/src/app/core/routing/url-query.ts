import { type Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type ParamMap, type Params, Router } from '@angular/router';
import { map } from 'rxjs';

/**
 * One query parameter. The address bar is user input, so `parse` never trusts it: anything
 * missing, unknown or out of range becomes `fallback`, and is therefore never sent to the
 * API. `format` returns null for the fallback, which keeps it out of the URL.
 */
export interface QueryField<T> {
  readonly fallback: T;
  parse(raw: string | null): T;
  format(value: T): string | null;
}

export type QueryShape = Readonly<Record<string, QueryField<unknown>>>;
export type QueryValues<S extends QueryShape> = {
  readonly [K in keyof S]: S[K] extends QueryField<infer T> ? T : never;
};

/** A filter that is either one of `values` or absent. */
export function optionalChoice<const V extends readonly string[]>(
  values: V,
): QueryField<V[number] | undefined> {
  return {
    fallback: undefined,
    parse: (raw) => values.find((value) => value === raw),
    format: (value) => value ?? null,
  };
}

/** One of `values`, defaulting to `fallback`. */
export function choice<const V extends readonly string[]>(
  values: V,
  fallback: V[number],
): QueryField<V[number]> {
  return {
    fallback,
    parse: (raw) => values.find((value) => value === raw) ?? fallback,
    format: (value) => (value === fallback ? null : value),
  };
}

/** Free text, trimmed. Empty or longer than `maxLength` counts as absent. */
export function searchText(maxLength: number): QueryField<string | undefined> {
  return {
    fallback: undefined,
    parse: (raw) => {
      const text = raw?.trim() ?? '';
      return text.length > 0 && text.length <= maxLength ? text : undefined;
    },
    format: (value) => value ?? null,
  };
}

/** A 1-based page number: digits only, 1 to `max`. */
export function pageNumber(max: number): QueryField<number> {
  return {
    fallback: 1,
    parse: (raw) => {
      const page = raw !== null && /^\d{1,6}$/.test(raw) ? Number(raw) : 1;
      return page >= 1 && page <= max ? page : 1;
    },
    format: (value) => (value === 1 ? null : String(value)),
  };
}

export function readQuery<S extends QueryShape>(shape: S, params: ParamMap): QueryValues<S> {
  const entries = Object.entries(shape).map(([key, field]) => [key, field.parse(params.get(key))]);
  // Built key by key from the shape itself, which TypeScript cannot follow through fromEntries.
  return Object.fromEntries(entries) as QueryValues<S>;
}

/** Every key of the shape, null where it is at its fallback, so stale params are removed. */
export function toQueryParams<S extends QueryShape>(shape: S, values: QueryValues<S>): Params {
  const byKey: Readonly<Record<string, unknown>> = values;
  const entries = Object.entries(shape).map(([key, field]) => [key, field.format(byKey[key])]);
  return Object.fromEntries(entries) as Params;
}

export interface UrlQuery<S extends QueryShape> {
  /** The parsed query, always valid. */
  readonly values: Signal<QueryValues<S>>;
  /**
   * Writes a change to the URL. Changing anything but the page goes back to page 1.
   * `isTyping` replaces the history entry, so each search keystroke does not add one.
   */
  update(change: Partial<QueryValues<S>>, options?: { readonly isTyping?: boolean }): void;
}

/** Query state that lives in the URL (§20), for the route of the calling component. */
export function injectUrlQuery<S extends QueryShape>(
  shape: S,
  pageKey: keyof S & string,
): UrlQuery<S> {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const values = toSignal(route.queryParamMap.pipe(map((params) => readQuery(shape, params))), {
    requireSync: true,
  });

  return {
    values,
    update: (change, options = {}) => {
      const isPaging = Object.keys(change).every((key) => key === pageKey);
      const next = { ...values(), ...change };
      const resetPage = isPaging ? {} : { [pageKey]: shape[pageKey]?.fallback };
      void router.navigate([], {
        relativeTo: route,
        queryParams: toQueryParams(shape, { ...next, ...resetPage }),
        replaceUrl: options.isTyping ?? false,
      });
    },
  };
}
