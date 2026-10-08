import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../storage/storage-keys';
import { LOCAL_STORAGE } from '../storage/web-storage';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

function isThemePreference(value: string | null): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value);
}

/**
 * The user's theme choice. An explicit choice sets `data-theme` on `<html>`, which
 * `_tokens.scss` turns into colors and `color-scheme`; "system" removes it so the
 * `prefers-color-scheme` media query decides.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly chosen = signal<ThemePreference>(this.saved());

  readonly preference = this.chosen.asReadonly();

  constructor() {
    effect(() => {
      this.apply(this.chosen());
    });
  }

  choose(preference: ThemePreference): void {
    this.chosen.set(preference);
    this.storage.write(STORAGE_KEYS.theme, preference);
  }

  private saved(): ThemePreference {
    const value = this.storage.read(STORAGE_KEYS.theme);
    return isThemePreference(value) ? value : 'system';
  }

  private apply(preference: ThemePreference): void {
    if (preference === 'system') {
      this.root.removeAttribute('data-theme');
      return;
    }
    this.root.setAttribute('data-theme', preference);
  }
}
