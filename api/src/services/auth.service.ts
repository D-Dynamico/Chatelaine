import { InvalidCredentialsError, SessionInvalidError } from '../domain/errors.js';
import { toUserView, type Role, type User, type UserView } from '../domain/user.js';
import type { Clock } from '../lib/clock.js';
import type { UserRepository } from '../repositories/contracts.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';

export interface LoginInput {
  readonly userId: string;
  readonly password: string;
  readonly role: Role;
}

export interface LoginResult {
  readonly token: string;
  readonly expiresAt: string;
  readonly user: UserView;
}

/** The role picked on the login page is a claim; it must match the stored role (D11). */
function canSignInAs(user: User, claimedRole: Role): boolean {
  return user.status === 'ACTIVE' && user.role === claimedRole;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
  ) {}

  /**
   * Unknown user, wrong password, disabled account and wrong role all end in the same
   * InvalidCredentialsError. The password is always checked first, against a decoy hash
   * when the user does not exist, so every failure costs the same bcrypt work.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const credentials = await this.users.findCredentials(input.userId);
    const passwordMatches = credentials
      ? await this.passwords.verify(input.password, credentials.passwordHash)
      : await this.passwords.verifyAgainstDecoy(input.password);

    if (!credentials || !passwordMatches || !canSignInAs(credentials.user, input.role)) {
      throw new InvalidCredentialsError();
    }

    const { user } = credentials;
    const signedInAt = this.clock.now().toISOString();
    await this.users.touchLastLogin(user.userId, signedInAt);
    const { token, expiresAt } = this.tokens.issue({ sub: user.userId, role: user.role });
    return { token, expiresAt, user: toUserView({ ...user, lastLoginAt: signedInAt }) };
  }

  /**
   * Turns a bearer token into the current user, re-reading the user on every request (D10).
   * A deleted, disabled or re-roled user loses access on their next call, not when the
   * token expires.
   */
  async resolveSession(token: string): Promise<User> {
    const claims = this.tokens.verify(token);
    const user = await this.users.findById(claims.sub);
    // The same rule as signing in: a session lasts only while the user could still sign in.
    if (!user || !canSignInAs(user, claims.role)) throw new SessionInvalidError();
    return user;
  }
}
