import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/dashboard', '/admin/users?role=ADMIN&page=2', '/'])('follows %s', (path) => {
    expect(safeReturnUrl(path)).toBe(path);
  });

  it.each([
    null,
    '',
    'https://evil.test/',
    '//evil.test/path',
    '/\\evil.test',
    'javascript:alert(1)',
    'dashboard',
    '/login',
    '/login?returnUrl=%2Fdashboard',
  ])('falls back to the dashboard for %s', (value) => {
    expect(safeReturnUrl(value)).toBe('/dashboard');
  });
});
