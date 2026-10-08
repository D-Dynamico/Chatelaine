import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  type Observable,
  catchError,
  defer,
  finalize,
  map,
  of,
  retry,
  switchMap,
  throwError,
  timeout,
  timer,
} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_PATHS } from '../http/api-paths';
import { type HealthResponse } from '../models/auth';
import { BootStatus, type ServerState } from './boot-status';

/** Timings from docs/FRONTEND.md §16. Render's free tier takes about a minute to wake. */
export const WAKE_TIMING = {
  attemptTimeoutMs: 5_000,
  retryEveryMs: 3_000,
  giveUpAfterMs: 90_000,
  wakingMessageAfterMs: 4_000,
} as const;

export const BOOT_MESSAGES = {
  connecting: 'Connecting to the server',
  waking: (seconds: number): string =>
    `Waking the server. Free hosting sleeps when idle, this can take up to a minute. ${String(seconds)} s`,
  restoring: 'Restoring your session',
} as const;

/**
 * Wakes the API, then restores a stored session (§16). Run by the app initializer before
 * the first render, and again by the login page's "Try again". Never errors: a failed boot
 * is a state the login page shows, not an exception.
 */
@Injectable({ providedIn: 'root' })
export class BootSequence {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly status = inject(BootStatus);

  run(): Observable<void> {
    return defer(() => this.wake()).pipe(
      switchMap((state) => {
        this.status.set(state);
        if (state.status !== 'awake') return of(undefined);
        this.status.show(BOOT_MESSAGES.restoring);
        return this.auth.restore();
      }),
      // Unreachable by construction (wake and restore both recover), kept because a
      // rejected initializer leaves a blank page.
      catchError(() => of(undefined)),
    );
  }

  private wake(): Observable<ServerState> {
    const startedAt = performance.now();
    this.status.set({ status: 'checking' });
    this.status.show(BOOT_MESSAGES.connecting);
    const ticker = timer(WAKE_TIMING.wakingMessageAfterMs, 1_000).subscribe(() => {
      const seconds = Math.round((performance.now() - startedAt) / 1_000);
      this.status.show(BOOT_MESSAGES.waking(seconds));
    });

    return this.checkHealth().pipe(
      retry({
        delay: (error: unknown) => {
          const elapsed = performance.now() - startedAt;
          const hasTimeLeft = elapsed + WAKE_TIMING.retryEveryMs < WAKE_TIMING.giveUpAfterMs;
          return hasTimeLeft ? timer(WAKE_TIMING.retryEveryMs) : throwError(() => error);
        },
      }),
      catchError(() => of<ServerState>({ status: 'unreachable' })),
      finalize(() => {
        ticker.unsubscribe();
      }),
    );
  }

  private checkHealth(): Observable<ServerState> {
    return defer(() => {
      const sentAt = performance.now();
      return this.http.get<HealthResponse>(API_PATHS.health).pipe(
        timeout(WAKE_TIMING.attemptTimeoutMs),
        map((): ServerState => ({
          status: 'awake',
          latencyMs: Math.round(performance.now() - sentAt),
        })),
      );
    });
  }
}
