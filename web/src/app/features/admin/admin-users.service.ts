import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  type Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { SessionStore } from '../../core/auth/session-store';
import { ApiError } from '../../core/http/api-error';
import { isSameQuery, toHttpParams } from '../../core/http/list-query';
import { API_PATHS, adminUserPath } from '../../core/http/api-paths';
import { type Page } from '../../core/models/paging';
import {
  type NewUser,
  type UserChanges,
  type UserDetail,
  type UserListQuery,
  type UserView,
} from '../../core/models/user';
import {
  type LoadState,
  keepDataWhileRefreshing,
  toLoadState,
} from '../../shared/load-state/load-state';

export type UsersPage = Page<UserView>;

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && error.code === 'USER_NOT_FOUND';
}

/**
 * The admin users API (§12, §20). Provided on the admin route, so it lives with those pages
 * and never reaches a General User's browser. Mutations return the server's answer and
 * nothing else: the UI waits for it rather than guessing (D24).
 */
@Injectable()
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly reloads = new Subject<void>();

  /** Reloads when the query changes or after `reload()`; the rows stay up meanwhile. */
  users$(query$: Observable<UserListQuery>): Observable<LoadState<UsersPage>> {
    return combineLatest([
      query$.pipe(distinctUntilChanged(isSameQuery)),
      this.reloads.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([query]) =>
        this.http
          .get<UsersPage>(API_PATHS.adminUsers, { params: toHttpParams(query) })
          .pipe(toLoadState((page) => page.total === 0)),
      ),
      keepDataWhileRefreshing(),
    );
  }

  /** "Try again" after a failure, and the refresh after a change. */
  reload(): void {
    this.reloads.next();
  }

  user(userId: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(adminUserPath(userId));
  }

  /**
   * Only a 404 means the userId is free. Any other failure is passed on, so a check that
   * could not run is never mistaken for an answer (§20).
   */
  isUserIdTaken(userId: string): Observable<boolean> {
    return this.user(userId).pipe(
      map(() => true),
      catchError((error: unknown) => (isNotFound(error) ? of(false) : throwError(() => error))),
    );
  }

  create(user: NewUser): Observable<UserView> {
    return this.http.post<UserView>(API_PATHS.adminUsers, user);
  }

  /** An admin editing their own row sees the new name in the shell at once (§15). */
  update(userId: string, changes: UserChanges): Observable<UserView> {
    return this.http.patch<UserView>(adminUserPath(userId), changes).pipe(
      tap((saved) => {
        this.session.refreshUser(saved);
      }),
    );
  }

  /** 204 No Content: the body is null. */
  remove(userId: string): Observable<null> {
    return this.http.delete<null>(adminUserPath(userId));
  }
}
