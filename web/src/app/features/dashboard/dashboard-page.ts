import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The access card, summary and records table arrive in Stage 4. */
@Component({
  selector: 'app-dashboard-page',
  template: '<h1 class="page-title">Dashboard</h1>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
