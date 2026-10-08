import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { APP_PATHS } from '../core/routing/app-paths';

@Component({
  selector: 'app-not-found-page',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="not-found">
      <h1 class="page-title">This page doesn't exist</h1>
      <p>The link may be out of date, or the address mistyped.</p>
      <a mat-flat-button [routerLink]="dashboardPath">Go to the dashboard</a>
    </section>
  `,
  styles: `
    .not-found {
      display: grid;
      justify-items: start;
      gap: var(--space-4);
      max-width: var(--reading-max);
    }

    p {
      margin: 0;
      color: var(--ink-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  protected readonly dashboardPath = APP_PATHS.dashboard;
}
