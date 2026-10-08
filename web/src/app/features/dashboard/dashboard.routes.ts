import { type Routes } from '@angular/router';
import { DashboardDataService } from './dashboard-data.service';
import { DashboardPage } from './dashboard-page';

/**
 * The dashboard's own route, so its data service is created with the page and destroyed
 * with it (§15), and neither lands in the initial bundle (§14).
 */
const dashboardRoutes: Routes = [
  { path: '', component: DashboardPage, providers: [DashboardDataService], title: 'Dashboard' },
];

export default dashboardRoutes;
