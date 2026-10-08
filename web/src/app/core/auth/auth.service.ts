import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, map, of, tap } from 'rxjs';
import { ApiError } from '../http/api-error';
import { API_PATHS } from '../http/api-paths';
import { silentAuth } from '../http/http-context-tokens';
import { type LoginRequest, type LoginResponse } from '../models/auth';
import { type UserView } from '../models/user';
import { SessionStore } from './session-store';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly users = inject(UserService);

  login(credentials: LoginRequest): Observable<UserView> {
    return this.http.post<LoginResponse>(API_PATHS.login, credentials).pipe(
      tap(({ token, user }) => {
        this.session.start(token, user);
      }),
      map(({ user }) => user),
    );
  }

  /** There is no logout endpoint: tokens are stateless, so forgetting it is the logout. */
  logout(): void {
    this.session.clear();
  }

  /**
   * Confirms a stored token with `/me`. Never errors, because the app initializer must
   * never reject (§16). A 401 means the token is dead, so it is dropped quietly; any other
   * failure keeps it, since the server may only be waking up.
   */
  restore(): Observable<void> {
    if (this.session.token() === null) return of(undefined);
    return this.users.getProfile(silentAuth()).pipe(
      map((user) => {
        this.session.restore(user);
      }),
      catchError((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) this.session.clear();
        return of(undefined);
      }),
    );
  }
}
