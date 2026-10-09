/**
 * Paths services request, relative to the API base. `apiUrlInterceptor` resolves them
 * against `API_BASE_URL`, so no service knows which server it talks to.
 */
export const API_PREFIX = 'api';

export const API_PATHS = {
  health: `${API_PREFIX}/health`,
  login: `${API_PREFIX}/auth/login`,
  me: `${API_PREFIX}/me`,
  records: `${API_PREFIX}/records`,
  summary: `${API_PREFIX}/records/summary`,
  adminUsers: `${API_PREFIX}/admin/users`,
} as const;

/** One user under the admin API. The userId is user input, so it is encoded. */
export function adminUserPath(userId: string): string {
  return `${API_PATHS.adminUsers}/${encodeURIComponent(userId)}`;
}
