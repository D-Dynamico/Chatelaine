import { type HttpContext, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable } from 'rxjs';
import { API_PATHS } from '../http/api-paths';
import { type UserView } from '../models/user';

/** The brief's "User Service": the signed-in user's own profile. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getProfile(context?: HttpContext): Observable<UserView> {
    return this.http.get<UserView>(API_PATHS.me, { context });
  }
}
