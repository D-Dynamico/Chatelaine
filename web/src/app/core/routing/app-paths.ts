/** Absolute app paths, for navigation and redirects (docs/FRONTEND.md §14). */
export const APP_PATHS = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  adminUsers: '/admin/users',
} as const;

/** Route path segments, without the leading slash, for route definitions. */
export const ROUTE_SEGMENTS = {
  login: 'login',
  dashboard: 'dashboard',
  admin: 'admin',
  users: 'users',
} as const;
