import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The Chatelaine mark: a ring and one key, the chatelaine's own object (§40). Drawn in
 * `currentColor`, so the place that shows it decides its color; the shell paints it in the
 * role color, because color in this app means access. Decorative: the name beside it is
 * the text.
 */
@Component({
  selector: 'app-brand-mark',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5 21 21M17 17l2.5-2.5M19.5 19.5l1.75-1.75" stroke-linecap="round" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: var(--brand-mark-size, 1.5rem);
      height: var(--brand-mark-size, 1.5rem);
      flex: none;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMark {}
