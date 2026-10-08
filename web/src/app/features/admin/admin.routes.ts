import { type Routes } from '@angular/router';
import { ROUTE_SEGMENTS } from '../../core/routing/app-paths';
import { UsersPage } from './users-page';

/** Loaded only through `loadChildren`, behind `roleGuard('ADMIN')` (§14). */
const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: ROUTE_SEGMENTS.users },
  { path: ROUTE_SEGMENTS.users, component: UsersPage, title: 'Users' },
];

export default adminRoutes;
