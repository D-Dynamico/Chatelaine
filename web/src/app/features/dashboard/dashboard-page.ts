import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DashboardDataService } from './dashboard-data.service';
import { ProfilePanel } from './profile-panel';
import { RecordsPanel } from './records-panel';
import { SummaryPanel } from './summary-panel';

/**
 * The container for the dashboard's panels. Each panel gets its own stream, so they fill
 * in independently, in whatever order their requests finish (§18).
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [ProfilePanel, RecordsPanel, SummaryPanel],
  template: `
    <h1 class="visually-hidden">Dashboard</h1>
    <app-profile-panel [state]="profile()" (retry)="data.retryProfile()" />
    <app-summary-panel [state]="summary()" (retry)="data.retrySummary()" />
    <app-records-panel />
  `,
  styles: `
    :host {
      display: grid;
      // minmax(0, 1fr): a plain 1fr track grows to its widest child's minimum content,
      // which at 360px pushed every panel off screen.
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly data = inject(DashboardDataService);
  protected readonly profile = toSignal(this.data.profile$, {
    initialValue: { status: 'loading' } as const,
  });
  protected readonly summary = toSignal(this.data.summary$, {
    initialValue: { status: 'loading' } as const,
  });
}
