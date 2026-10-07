import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../domain/limits.js';

/** Any fixed string works; its hash only exists to make unknown-user logins cost the same. */
const TIMING_DECOY = 'chatelaine-timing-decoy';

export class PasswordService {
  private decoyHash: Promise<string> | undefined;

  constructor(private readonly cost: number = BCRYPT_COST) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Does the same bcrypt work as a real check, then fails. Used when the userId does not
   * exist, so response time does not reveal which accounts are real (docs/API.md §10).
   */
  async verifyAgainstDecoy(plain: string): Promise<false> {
    this.decoyHash ??= this.hash(TIMING_DECOY);
    await bcrypt.compare(plain, await this.decoyHash);
    return false;
  }
}
