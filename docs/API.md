# API

Sections §8 to §13. Frontend models in `web/src/app/core/models/` mirror this file; change
both in the same commit.

## §8 Conventions

- **Base path:** `/api`. Local base URL `http://localhost:3000/api`; production is the Render
  URL, set in `web/src/environments/environment.prod.ts`.
- **Format:** JSON in and out, UTF-8. Timestamps are ISO 8601 strings in UTC.
- **Auth:** `Authorization: Bearer <jwt>` on every route except `GET /health` and
  `POST /auth/login`. The token is HS256, carries `sub` (userId) and `role`, and expires
  after `JWT_TTL` (default 2 hours).
- **Every authenticated request re-loads the user.** A missing, disabled or re-roled user
  gets 401 `SESSION_INVALID` even with an unexpired token (D10).
- **Validation:** every body, param and query is parsed by a zod schema before the
  controller runs. Unknown body keys are rejected, not ignored.
- **Paging:** list endpoints take `page` (1-based, default 1) and `pageSize` (default 10,
  max 50) and return `{ items, page, pageSize, total }` (D13).
- **Headers on every response:** `X-Request-Id` (also written to the log line) and
  `Server-Timing` (§9). CORS exposes both, plus `Location`.
- **CORS:** origins from `CORS_ORIGIN` (comma-separated). No credentials mode; the token
  travels in a header, not a cookie (D9).
- **Security headers:** `helmet` defaults. `POST /auth/login` is rate limited (§10).
- **Client IP:** the rate limit keys on `req.ip`. `TRUST_PROXY` sets Express's
  `trust proxy` hop count: `3` on Render, unset locally. Render's free web services sit behind
  Cloudflare, then Render's front proxy, then a local proxy, so the visitor is the third
  address back from the socket. Measured on the live service at Stage 7: the header read
  `<client>, <Cloudflare edge>, <Render internal>` and `req.ip` was the Render internal
  address with `1`, which would have put every visitor in one rate-limit bucket. With the
  count right, an address a client invents in its own `X-Forwarded-For` is ignored. Without
  the setting at all `express-rate-limit` raises `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`.

## §9 Simulation parameters

Two query parameters work on every route except `/health`. They exist so the UI can show
asynchronous behaviour on demand (D16, D17).

| Param | Values | Effect |
|---|---|---|
| `delay` | integer `0` to `10000` (ms) | The response is held for that long before the route runs |
| `fail` | `true` | After any delay, the route returns 503 `SIMULATED_FAILURE` |

- Anything else (`delay=-1`, `delay=abc`, `delay=10001`, `fail=yes`) is a 400
  `VALIDATION_FAILED`. No silent defaults.
- The delay runs **before** authentication, so a delayed request with a bad token still
  waits, then fails. This keeps the timeline honest about where time went.
- With `SIMULATION_ENABLED=false` both parameters are rejected with 400
  `SIMULATION_DISABLED`. The default is `true`, because the demo depends on it.
- `/health` ignores both, so the boot check (§16) measures the real server.

**`Server-Timing` header.** Every response reports where server time went:

```
Server-Timing: delay;dur=1500, app;dur=12
```

`delay` is the simulated wait, `app` is everything after it. The request timeline in the
latency lab uses this to split each bar into simulated delay, server work and network.

`app` ends when the status line and headers are written, which happens inside `res.json()`,
after any handler code could set a header. So the request-context middleware wraps
`res.writeHead` once per request and appends `Server-Timing` there. This needs no extra
dependency; `on-headers` would do the same and is not on the allowlist (D29).

## §10 Health and auth

### `GET /health`

No auth, no simulation. Used by the app initializer and by Render's health check.

```json
200 { "status": "ok", "storage": "mongo", "uptimeSeconds": 412, "version": "1.0.0" }
```

### `POST /auth/login`

```json
{ "userId": "riya", "password": "Chatelaine@2026", "role": "GENERAL" }
```

| Field | Rule |
|---|---|
| `userId` | 3 to 32 chars, `[a-z0-9._-]`, trimmed and lower-cased before lookup |
| `password` | 1 to 128 chars (the policy in §12 applies when setting, not when checking) |
| `role` | `GENERAL` or `ADMIN` |

```json
200 {
  "token": "eyJ...",
  "expiresAt": "2026-10-08T12:30:00.000Z",
  "user": { ...UserView }
}
```

- **401 `INVALID_CREDENTIALS`** for an unknown user, a wrong password, a disabled account,
  or a role that does not match the stored one. All four return the identical body, and
  the unknown-user path still runs a bcrypt compare against a dummy hash so timing does not
  reveal which case it was.
- **429 `RATE_LIMITED`** after 10 attempts in 15 minutes from one IP. `Retry-After` header
  is set.

### `GET /me`

Returns the signed-in user. Used both to restore a session on boot and by the dashboard's
profile panel.

```json
200 {
  "userId": "riya",
  "displayName": "Riya Sharma",
  "email": "riya@chatelaine.test",
  "department": "Finance",
  "role": "GENERAL",
  "status": "ACTIVE",
  "createdAt": "2026-09-01T09:00:00.000Z",
  "updatedAt": "2026-09-01T09:00:00.000Z",
  "lastLoginAt": "2026-10-07T13:02:11.000Z",
  "previousLoginAt": "2026-10-06T09:30:00.000Z"
}
```

This shape is `UserView`. It never contains `passwordHash` or `password`.

`lastLoginAt` is the sign-in that created the current session, so for the signed-in user it
can only ever mean "just now". `previousLoginAt` is the one before it, or `null` for a
first sign-in, and is what the access card shows as "Last signed in" (D36). Both are
`null` for a user who has never signed in.

There is no logout endpoint. Tokens are stateless; logging out clears the token in the
browser. Token revocation is listed as future scope.

## §11 Service requests

### `GET /records`

| Query | Values | Default |
|---|---|---|
| `page`, `pageSize` | see §8 | `1`, `10` |
| `sort` | `createdAt`, `updatedAt`, `priority`, `status`, `title` | `createdAt` |
| `order` | `asc`, `desc` | `desc` |
| `status` | one of the status enum values | all |
| `priority` | one of the priority enum values | all |
| `accessLevel` | `GENERAL`, `ADMIN` (admins only; a General User sending it gets 403) | all in scope |
| `q` | 1 to 60 chars, matched case-insensitively against `id` and `title` | none |

`sort=priority` orders by severity (`CRITICAL` highest), not alphabetically.

**General User** response item (restricted keys absent):

```json
{
  "id": "SR-1042",
  "title": "Laptop battery swells after charging",
  "category": "HARDWARE",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "accessLevel": "GENERAL",
  "createdAt": "2026-09-22T06:15:00.000Z",
  "updatedAt": "2026-09-24T10:40:00.000Z"
}
```

**Admin** response item adds `ownerId`, `ownerName`, `assignee` and `internalNote`.
`ownerName` is joined in the service so the table never shows bare IDs.

```json
200 { "items": [ ... ], "page": 1, "pageSize": 10, "total": 23 }
```

### `GET /records/summary`

Counts over the caller's scope, for the summary panel.

```json
200 {
  "scope": "OWN",
  "total": 18,
  "byStatus":   { "OPEN": 5, "IN_PROGRESS": 4, "RESOLVED": 6, "CLOSED": 3 },
  "byPriority": { "LOW": 4, "MEDIUM": 7, "HIGH": 5, "CRITICAL": 2 },
  "byAccessLevel": { "GENERAL": 18 }
}
```

`scope` is `OWN` for a General User and `ALL` for an Admin. A General User's counts never
include `ADMIN`-level requests, so the summary cannot be used to infer hidden ones.

## §12 Admin: users

Every route here requires role `ADMIN`. A General User gets 403 `FORBIDDEN` before
validation runs, so a General User learns nothing about the shape of these endpoints.

### `GET /admin/users`

| Query | Values | Default |
|---|---|---|
| `page`, `pageSize` | see §8 | `1`, `10` |
| `sort` | `userId`, `displayName`, `role`, `status`, `createdAt`, `lastLoginAt` | `userId` |
| `order` | `asc`, `desc` | `asc` |
| `role`, `status` | enum values | all |
| `q` | matched against `userId`, `displayName`, `email` | none |

```json
200 { "items": [ ...UserView ], "page": 1, "pageSize": 10, "total": 6 }
```

### `GET /admin/users/:userId`

`UserView` plus `recordCount`. Returns 404 `USER_NOT_FOUND` if absent, which the create
form's availability check relies on (§20).

### `POST /admin/users`

```json
{
  "userId": "neha",
  "displayName": "Neha Iyer",
  "email": "neha@chatelaine.test",
  "department": "Design",
  "role": "GENERAL",
  "password": "Welcome@2026"
}
```

Password policy: 8 to 128 characters, at least one letter and one digit.

- **201** with `UserView` and `Location: /api/admin/users/neha`.
- **409 `USER_EXISTS`** if the `userId` is taken.

### `PATCH /admin/users/:userId`

Any subset of `displayName`, `email`, `department`, `role`, `status`, `password`. At least
one field is required. `userId` cannot be changed.

- **200** with the updated `UserView`.
- **409 `SELF_ACTION`** if an admin changes their own `role` or `status` to a different
  value. Sending their current value is not a change and is accepted.
- **409 `LAST_ADMIN`** if the change would leave no active admin (see the note below).

**About `LAST_ADMIN`.** Through a single request it cannot trigger: the caller is always an
active admin, and changing their own account is already `SELF_ACTION`, so at least the
caller remains. The check is defence in depth for two cases: two admins demoting each other
at the same moment, and any future code path that changes users without a caller (scripts,
imports). It narrows the race rather than closing it; a transaction or conditional write
would close it, and is listed as future scope (D30).

### `DELETE /admin/users/:userId`

Deletes the user **and their service requests** (D15). The UI shows the request count first.

- **204** on success.
- **409 `SELF_ACTION`** for the caller's own account.
- **409 `LAST_ADMIN`** if this is the last active admin.

## §13 Error codes

Every error has one shape, produced only by the error middleware:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "delay must be between 0 and 10000", "details": [ ... ] } }
```

`details` appears only for validation errors: a list of `{ path, message }` from zod.
`message` is written for a person and safe to show in the UI. Stack traces and internal
messages are logged, never returned.

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body, param or query failed its schema, including bad simulation params |
| 400 | `SIMULATION_DISABLED` | `delay` or `fail` sent while `SIMULATION_ENABLED=false` |
| 401 | `UNAUTHENTICATED` | No token, malformed token, bad signature, expired |
| 401 | `SESSION_INVALID` | Valid token, but the user is gone, disabled or has a different role now |
| 401 | `INVALID_CREDENTIALS` | Login failed for any reason |
| 403 | `FORBIDDEN` | Authenticated, but the role is not allowed |
| 404 | `USER_NOT_FOUND` | Admin route for a userId that does not exist |
| 404 | `NOT_FOUND` | Unknown route |
| 409 | `USER_EXISTS` | Create with a taken userId |
| 409 | `SELF_ACTION` | Admin deleting, demoting or disabling themselves |
| 409 | `LAST_ADMIN` | Change would leave no active admin |
| 429 | `RATE_LIMITED` | Too many login attempts |
| 500 | `INTERNAL` | Anything unexpected. Message is generic |
| 503 | `SIMULATED_FAILURE` | `fail=true` was sent |
