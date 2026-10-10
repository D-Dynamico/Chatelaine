import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { injectUrlQuery } from '../../core/routing/url-query';
import { DashboardDataService } from './dashboard-data.service';
import { ProfilePanel } from './profile-panel';
import { RecordsPanel } from './records-panel';
import { RECORDS_QUERY } from './records-query';
import { type SummaryFilter, SummaryPanel } from './summary-panel';

/**
 * The container for the dashboard's panels. Each panel gets its own state, and the lab's
 * loading strategy decides whether they fill in independently, together or in turn (§19).
 * The summary's counts filter the records table through the same URL query the table
 * reads, so a pick is shareable and Back undoes it (§40).
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [ProfilePanel, RecordsPanel, SummaryPanel],
  template: `
    <h1 class="visually-hidden">Dashboard</h1>
    <app-profile-panel [state]="profile()" (retry)="data.retryProfile()" />
    <app-summary-panel
      [state]="summary()"
      [activeStatus]="recordsQuery.values().status"
      [activePriority]="recordsQuery.values().priority"
      (retry)="data.retrySummary()"
      (pick)="filterRecords($event)"
    />
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
  protected readonly profile = this.data.profile;
  protected readonly summary = this.data.summary;
  protected readonly recordsQuery = injectUrlQuery(RECORDS_QUERY, 'page');

  protected filterRecords(filter: SummaryFilter): void {
    this.recordsQuery.update(filter);
  }
}
