import { type Routes } from '@angular/router';
import { ROUTE_SEGMENTS } from '../../core/routing/app-paths';
import { AdminUsersService } from './admin-users.service';
import { UsersPage } from './users-page';

/**
 * Loaded only through `loadChildren`, behind `roleGuard('ADMIN')` (§14). The service is
 * provided here, so it lives with the admin pages and ships only in their chunk (§15).
 */
const adminRoutes: Routes = [
  {
    path: '',
    providers: [AdminUsersService],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_SEGMENTS.users },
      { path: ROUTE_SEGMENTS.users, component: UsersPage, title: 'Users' },
    ],
  },
];

export default adminRoutes;
