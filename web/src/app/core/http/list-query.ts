import { HttpParams } from '@angular/common/http';

/** A list endpoint's query (§8): flat values, with unset filters left `undefined`. */
export type ListQuery = object;

/** Only the fields that are set, so an absent filter never reaches the API as "undefined". */
export function toHttpParams(query: ListQuery): HttpParams {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined);
  return new HttpParams({ fromObject: Object.fromEntries(entries) });
}

/** Queries are built field by field in a fixed order, so equal queries serialize equally. */
export function isSameQuery(a: ListQuery, b: ListQuery): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
