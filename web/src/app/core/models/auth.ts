import { type Role, type UserView } from './user';

/** Mirrors docs/API.md §10. */

export interface LoginRequest {
  readonly userId: string;
  readonly password: string;
  readonly role: Role;
}

export interface LoginResponse {
  readonly token: string;
  readonly expiresAt: string;
  readonly user: UserView;
}

export interface HealthResponse {
  readonly status: 'ok';
  readonly storage: 'file' | 'mongo' | 'dynamo';
  readonly uptimeSeconds: number;
  readonly version: string;
}
