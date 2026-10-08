import { type Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';
import { roleGuard } from './core/auth/role-guard';
import { ROUTE_SEGMENTS } from './core/routing/app-paths';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { NotFoundPage } from './layout/not-found-page';
import { Shell } from './layout/shell';

/** The route table from docs/FRONTEND.md §14. */
export const routes: Routes = [
  {
    path: ROUTE_SEGMENTS.login,
    canMatch: [guestGuard],
    component: LoginPage,
    title: 'Sign in',
  },
  {
    path: '',
    canMatch: [authGuard],
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_SEGMENTS.dashboard },
      { path: ROUTE_SEGMENTS.dashboard, component: DashboardPage, title: 'Dashboard' },
      {
        path: ROUTE_SEGMENTS.admin,
        canMatch: [roleGuard('ADMIN')],
        loadChildren: () => import('./features/admin/admin.routes'),
      },
      { path: '**', component: NotFoundPage, title: 'Page not found' },
    ],
  },
];
