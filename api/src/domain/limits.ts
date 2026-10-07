/** Upper bound for ?delay=, in milliseconds (docs/API.md §9). Above it is a 400. */
export const DELAY_MAX_MS = 10_000;

/** bcrypt work factor for stored passwords (docs/ARCHITECTURE.md §5). */
export const BCRYPT_COST = 10;

/** Login attempts allowed per client IP per window (docs/API.md §10, D27). */
export const LOGIN_RATE_LIMIT = { attempts: 10, windowMs: 15 * 60 * 1000 } as const;

/** Passwords are checked up to this length; longer input is refused before bcrypt runs. */
export const PASSWORD_MAX_LENGTH = 128;

/** Password policy when a password is set (docs/API.md §12). */
export const PASSWORD_MIN_LENGTH = 8;
