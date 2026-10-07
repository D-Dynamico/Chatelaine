import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UnauthenticatedError } from '../domain/errors.js';
import { ROLES, type Role } from '../domain/user.js';
import type { Clock } from '../lib/clock.js';

const ALGORITHM = 'HS256';
const MS_PER_SECOND = 1000;

const claimsSchema = z.object({ sub: z.string().min(1), role: z.enum(ROLES) });

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

  /**
   * Returns the claims of a token this service signed and that has not expired. Anything
   * else (malformed, wrong signature, another algorithm, expired, unexpected claims) is
   * UnauthenticatedError. Only HS256 is accepted, so a token cannot choose "none".
   */
  verify(token: string): TokenClaims {
    let payload: unknown;
    try {
      payload = jwt.verify(token, this.settings.secret, {
        algorithms: [ALGORITHM],
        clockTimestamp: Math.floor(this.clock.now().getTime() / MS_PER_SECOND),
      });
    } catch {
      throw new UnauthenticatedError();
    }
    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) throw new UnauthenticatedError();
    return claims.data;
  }
}
