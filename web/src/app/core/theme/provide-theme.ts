import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { ThemeService } from './theme.service';

/**
 * Applies the saved theme before the first render, and points `<mat-icon>` at the
 * Material Symbols font that `index.html` loads (Material defaults to the older
 * Material Icons font, which this app does not load).
 */
export function provideTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      inject(ThemeService);
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    }),
  ]);
}
