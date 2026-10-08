import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

export type ServerState =
  | { readonly status: 'checking' }
  | { readonly status: 'awake'; readonly latencyMs: number }
  | { readonly status: 'unreachable' };

/** The id of the status line in index.html's static splash. */
export const BOOT_STATUS_ELEMENT_ID = 'boot-status';

/**
 * What the boot sequence knows about the server (§16). While Angular has not rendered yet,
 * the only thing on screen is the static splash, so messages are written into it directly;
 * afterwards the login page reads `server` instead.
 */
@Injectable({ providedIn: 'root' })
export class BootStatus {
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<ServerState>({ status: 'checking' });

  readonly server = this.state.asReadonly();

  set(state: ServerState): void {
    this.state.set(state);
  }

  /** Updates the splash. Does nothing once Angular has replaced it. */
  show(message: string): void {
    const element = this.document.getElementById(BOOT_STATUS_ELEMENT_ID);
    if (element) element.textContent = message;
  }
}
