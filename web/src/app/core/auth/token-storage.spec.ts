import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { TokenStorage } from './token-storage';

describe('TokenStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('keeps the token in sessionStorage, so it does not outlive the tab (D9)', () => {
    const tokens = TestBed.inject(TokenStorage);

    tokens.write('jwt');

    expect(sessionStorage.getItem(STORAGE_KEYS.token)).toBe('jwt');
    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull();
    tokens.clear();
    expect(tokens.read()).toBeNull();
  });

  it('works when sessionStorage throws, as in some private modes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'QuotaExceededError');
    });
    const tokens = TestBed.inject(TokenStorage);

    expect(() => {
      tokens.write('jwt');
      tokens.clear();
    }).not.toThrow();
    expect(tokens.read()).toBeNull();
  });
});
