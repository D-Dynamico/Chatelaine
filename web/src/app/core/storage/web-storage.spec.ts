import { TestBed } from '@angular/core/testing';
import { LOCAL_STORAGE, SESSION_STORAGE } from './web-storage';

describe('web storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('reads back what it wrote, in the right storage', () => {
    const session = TestBed.inject(SESSION_STORAGE);
    const local = TestBed.inject(LOCAL_STORAGE);

    session.write('k', 'tab');
    local.write('k', 'device');

    expect(sessionStorage.getItem('k')).toBe('tab');
    expect(localStorage.getItem('k')).toBe('device');
    session.remove('k');
    expect(session.read('k')).toBeNull();
    expect(local.read('k')).toBe('device');
  });

  it('turns a throwing storage into empty reads and dropped writes', () => {
    const blocked = (): never => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    const session = TestBed.inject(SESSION_STORAGE);

    expect(() => {
      session.write('k', 'v');
      session.remove('k');
    }).not.toThrow();
    expect(session.read('k')).toBeNull();
  });
});
