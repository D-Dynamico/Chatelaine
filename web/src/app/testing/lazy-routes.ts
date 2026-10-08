/** Long enough for a cold compile of every lazy page under a full, parallel test run. */
export const WARM_UP_TIMEOUT_MS = 60_000;

/**
 * Imports every lazily loaded page once. In the test environment a lazy module is compiled
 * on its first import, which under a full parallel run can take longer than a test's own
 * timeout. Specs that navigate through the real route table warm them up in `beforeAll`,
 * so each test's time measures the router, not the compiler.
 */
export async function warmLazyRoutes(): Promise<void> {
  await Promise.all([
    import('../features/auth/login-page'),
    import('../layout/shell'),
    import('../features/dashboard/dashboard.routes'),
    import('../features/admin/admin.routes'),
    import('../layout/not-found-page'),
  ]);
}
