import { Injectable, signal } from '@angular/core';
import { type EndpointGroup } from './endpoint-group';

export type RequestOutcome = 'pending' | 'ok' | 'error' | 'cancelled' | 'timeout';

/** One row of the request timeline (docs/FRONTEND.md §17). */
export interface RequestLogEntry {
  readonly id: number;
  readonly group: EndpointGroup;
  readonly method: string;
  /** Path and query, no host. */
  readonly url: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly outcome: RequestOutcome;
  readonly status: number | null;
  readonly serverDelayMs: number | null;
  readonly serverWorkMs: number | null;
}

export type RequestStart = Pick<RequestLogEntry, 'group' | 'method' | 'url'>;
export type RequestEnd = Pick<RequestLogEntry, 'outcome' | 'status'> &
  Partial<Pick<RequestLogEntry, 'serverDelayMs' | 'serverWorkMs'>>;

export const REQUEST_LOG_LIMIT = 40;

@Injectable({ providedIn: 'root' })
export class RequestLogStore {
  private readonly log = signal<readonly RequestLogEntry[]>([]);
  private nextId = 1;

  /** Oldest first, at most the last 40. */
  readonly entries = this.log.asReadonly();

  start(request: RequestStart): number {
    const id = this.nextId++;
    const entry: RequestLogEntry = {
      ...request,
      id,
      startedAt: performance.now(),
      endedAt: null,
      outcome: 'pending',
      status: null,
      serverDelayMs: null,
      serverWorkMs: null,
    };
    this.log.update((entries) => [...entries, entry].slice(-REQUEST_LOG_LIMIT));
    return id;
  }

  finish(id: number, end: RequestEnd): void {
    const endedAt = performance.now();
    this.log.update((entries) =>
      entries.map((entry) => (entry.id === id ? { ...entry, ...end, endedAt } : entry)),
    );
  }

  clear(): void {
    this.log.set([]);
  }
}
