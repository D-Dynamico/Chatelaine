import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { THEME_PREFERENCES, type ThemePreference } from '../core/theme/theme.service';

const THEME_OPTIONS: Readonly<Record<ThemePreference, { label: string; icon: string }>> = {
  light: { label: 'Light', icon: 'light_mode' },
  dark: { label: 'Dark', icon: 'dark_mode' },
  system: { label: 'Match system', icon: 'contrast' },
};

/** Light, dark or system. The button shows the current choice; the menu offers all three. */
@Component({
  selector: 'app-theme-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="'Theme: ' + current().label"
      [matTooltip]="'Theme: ' + current().label"
    >
      <mat-icon>{{ current().icon }}</mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      @for (option of options; track option.value) {
        <button
          mat-menu-item
          role="menuitemradio"
          [attr.aria-checked]="option.value === preference()"
          (click)="choose.emit(option.value)"
        >
          <mat-icon>{{ option.icon }}</mat-icon>
          <span>{{ option.label }}</span>
        </button>
      }
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeMenu {
  readonly preference = input.required<ThemePreference>();
  readonly choose = output<ThemePreference>();

  protected readonly options = THEME_PREFERENCES.map((value) => ({
    value,
    ...THEME_OPTIONS[value],
  }));
  protected readonly current = computed(() => THEME_OPTIONS[this.preference()]);
}
