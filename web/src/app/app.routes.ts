import { type Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';
import { roleGuard } from './core/auth/role-guard';
import { ROUTE_SEGMENTS } from './core/routing/app-paths';

/**
 * The route table from docs/FRONTEND.md §14. Every page is its own chunk, so a visitor
 * downloads the sign-in form or the shell, not both, and a General User never downloads
 * admin code. Initial navigation blocks bootstrap (app.config.ts), so the boot splash
 * stays up until the first page's chunk has arrived.
 */
export const routes: Routes = [
  {
    path: ROUTE_SEGMENTS.login,
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
    title: 'Sign in',
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: ROUTE_SEGMENTS.dashboard },
      {
        path: ROUTE_SEGMENTS.dashboard,
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
        title: 'Dashboard',
      },
      {
        path: ROUTE_SEGMENTS.admin,
        canMatch: [roleGuard('ADMIN')],
        loadChildren: () => import('./features/admin/admin.routes'),
      },
      {
        path: '**',
        loadComponent: () => import('./layout/not-found-page').then((m) => m.NotFoundPage),
        title: 'Page not found',
      },
    ],
  },
];
