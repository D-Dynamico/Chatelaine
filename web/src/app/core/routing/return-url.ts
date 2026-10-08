import { APP_PATHS } from './app-paths';

/**
 * Where to go after signing in. Only a path inside this app is followed: `returnUrl` comes
 * from the address bar, so anything else (another origin, a protocol-relative `//host`, a
 * backslash some browsers treat as a slash, or the sign-in page itself) falls back to the
 * dashboard rather than becoming an open redirect.
 */
export function safeReturnUrl(value: string | null): string {
  if (!value?.startsWith('/')) return APP_PATHS.dashboard;
  if (value.startsWith('//') || value.includes('\\')) return APP_PATHS.dashboard;
  if (value === APP_PATHS.login || value.startsWith(`${APP_PATHS.login}?`)) {
    return APP_PATHS.dashboard;
  }
  return value;
}
