import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A placeholder block shaped like the content it stands in for (§24). Panels compose
 * several to match their layout. Hidden from assistive tech: the panel's `aria-busy`
 * says it is loading.
 */
@Component({
  selector: 'app-skeleton',
  template: '',
  styles: `
    :host {
      display: block;
      height: var(--skeleton-height, 1em);
      width: var(--skeleton-width, 100%);
      border-radius: var(--radius-control);
      background: var(--line);
      opacity: 0.6;
      animation: pulse 1.6s ease-in-out infinite;
    }

    @keyframes pulse {
      50% {
        opacity: 0.3;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[style.--skeleton-height]': 'height()',
    '[style.--skeleton-width]': 'width()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly height = input('1em');
  readonly width = input('100%');
}
