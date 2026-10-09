import { Injectable, computed, inject, signal } from '@angular/core';
import { type UserView } from '../models/user';
import { TokenStorage } from './token-storage';

/**
 * The one writer of session state (§15). On boot the token comes back from storage before
 * the user does, so "signed in" needs both: a token alone is only a session waiting for
 * `/me` to confirm it.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly tokens = inject(TokenStorage);
  private readonly currentToken = signal(this.tokens.read());
  private readonly currentUser = signal<UserView | null>(null);

  readonly token = this.currentToken.asReadonly();
  readonly user = this.currentUser.asReadonly();
  readonly isSignedIn = computed(() => this.token() !== null && this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  start(token: string, user: UserView): void {
    this.tokens.write(token);
    this.currentToken.set(token);
    this.currentUser.set(user);
  }

  /** Confirms the stored token by attaching the user `/me` returned for it. */
  restore(user: UserView): void {
    this.currentUser.set(user);
  }

  /**
   * Takes a newer copy of the signed-in user, such as the answer to an admin editing their
   * own row, so the shell never shows a name the server has replaced. Any other user, or
   * none signed in, is ignored: this can refresh the session, never switch it.
   */
  refreshUser(user: UserView): void {
    if (this.currentUser()?.userId !== user.userId) return;
    this.currentUser.set(user);
  }

  clear(): void {
    this.tokens.clear();
    this.currentToken.set(null);
    this.currentUser.set(null);
  }
}
