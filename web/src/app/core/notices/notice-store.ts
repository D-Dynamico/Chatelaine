import { Injectable, signal } from '@angular/core';

/**
 * Short messages for the user that eager code wants shown, such as the role guard's
 * refusal. The shell shows them as snackbars. Opening a snackbar directly from a guard
 * pulled Material's overlay into the initial bundle, about 150 kB, for one sentence.
 */
@Injectable({ providedIn: 'root' })
export class NoticeStore {
  private readonly queue = signal<readonly string[]>([]);

  readonly pending = this.queue.asReadonly();

  post(message: string): void {
    this.queue.update((messages) => [...messages, message]);
  }

  /** Removes and returns the oldest message, for whoever shows it. */
  take(): string | undefined {
    const [next, ...rest] = this.queue();
    this.queue.set(rest);
    return next;
  }
}
