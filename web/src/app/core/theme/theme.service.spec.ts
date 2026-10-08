import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = TestBed.inject(DOCUMENT).documentElement;
  });

  afterEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
  });

  it('follows the system until the user chooses', () => {
    const theme = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(theme.preference()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('sets data-theme for an explicit choice and remembers it', () => {
    const theme = TestBed.inject(ThemeService);

    theme.choose('dark');
    TestBed.tick();

    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark');
  });

  it('removes data-theme when going back to system', () => {
    const theme = TestBed.inject(ThemeService);
    theme.choose('light');
    TestBed.tick();

    theme.choose('system');
    TestBed.tick();

    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('system');
  });

  it('starts from the saved choice', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'light');

    const theme = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(theme.preference()).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('ignores a saved value it does not know', () => {
    localStorage.setItem(STORAGE_KEYS.theme, 'sepia');

    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });
});
