import { describe, expect, it } from 'vitest';
import { PasswordService } from '../../src/services/password.service.js';

// Cost 4 keeps the suite fast; the cost is read from each hash when verifying.
const passwords = new PasswordService(4);

describe('PasswordService', () => {
  it('verifies the password a hash was made from, and nothing else', async () => {
    const hash = await passwords.hash('Chatelaine@2026');
    expect(hash).not.toContain('Chatelaine@2026');
    expect(await passwords.verify('Chatelaine@2026', hash)).toBe(true);
    expect(await passwords.verify('chatelaine@2026', hash)).toBe(false);
  });

  it('salts each hash, so equal passwords do not produce equal hashes', async () => {
    expect(await passwords.hash('same')).not.toBe(await passwords.hash('same'));
  });

  it('always rejects when checking against the decoy', async () => {
    expect(await passwords.verifyAgainstDecoy('chatelaine-timing-decoy')).toBe(false);
    expect(await passwords.verifyAgainstDecoy('anything')).toBe(false);
  });

  it('hashes at the configured cost', async () => {
    expect(await new PasswordService(5).hash('x')).toMatch(/^\$2[aby]\$05\$/);
  });
});
