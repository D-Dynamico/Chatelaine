import jwt from 'jsonwebtoken';
import type { Role } from '../domain/user.js';
import type { Clock } from '../lib/clock.js';

const ALGORITHM = 'HS256';
const MS_PER_SECOND = 1000;

export interface TokenClaims {
  readonly sub: string;
  readonly role: Role;
}

export interface IssuedToken {
  readonly token: string;
  readonly expiresAt: string;
}

export interface TokenSettings {
  readonly secret: string;
  readonly ttlSeconds: number;
}

/**
 * Signs session tokens. Issue and expiry times come from the injected clock rather than
 * from jsonwebtoken's own Date.now(), so tests can pin time and expiry is testable.
 */
export class TokenService {
  constructor(
    private readonly settings: TokenSettings,
    private readonly clock: Clock,
  ) {}

  issue(claims: TokenClaims): IssuedToken {
    const issuedAt = Math.floor(this.clock.now().getTime() / MS_PER_SECOND);
    const expiresAt = issuedAt + this.settings.ttlSeconds;
    const token = jwt.sign(
      { sub: claims.sub, role: claims.role, iat: issuedAt, exp: expiresAt },
      this.settings.secret,
      { algorithm: ALGORITHM },
    );
    return { token, expiresAt: new Date(expiresAt * MS_PER_SECOND).toISOString() };
  }
}
