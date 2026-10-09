import { signal } from '@angular/core';
import { type AsyncValidatorFn } from '@angular/forms';
import { type Observable, catchError, map, of, switchMap, tap, timer } from 'rxjs';

export const AVAILABILITY_DEBOUNCE_MS = 400;

/** What the last finished check found for a userId. */
export type AvailabilityResult = 'available' | 'taken' | 'unchecked';

/**
 * The create form's userId availability check (§20). As an async validator it waits
 * 400 ms, then asks the server. Angular unsubscribes the previous run on every keystroke,
 * so a check still waiting never sends, and one in flight is cancelled through `switchMap`.
 *
 * A check that could not run (a 5xx, a timeout, an armed failure) is not a validation
 * error: the validator returns null, so the form can still be submitted, and `resultFor`
 * reports `unchecked` so the field can say so. The server's 409 `USER_EXISTS` stays the
 * real guard.
 */
export class UserIdAvailability {
  private readonly last = signal<{ userId: string; result: AvailabilityResult } | null>(null);

  constructor(private readonly isTaken: (userId: string) => Observable<boolean>) {}

  readonly validator: AsyncValidatorFn = (control) => {
    const userId = String(control.value).trim();
    return timer(AVAILABILITY_DEBOUNCE_MS).pipe(
      switchMap(() => this.isTaken(userId)),
      map((taken): AvailabilityResult => (taken ? 'taken' : 'available')),
      catchError(() => of<AvailabilityResult>('unchecked')),
      tap((result) => {
        this.last.set({ userId, result });
      }),
      map((result) => (result === 'taken' ? { userIdTaken: true } : null)),
    );
  };

  /** The last result for exactly this userId, or null if it was never checked. */
  resultFor(userId: string): AvailabilityResult | null {
    const last = this.last();
    return last?.userId === userId.trim() ? last.result : null;
  }
}
