# Test plan

Sections §33 to §38.

## §33 Strategy and tools

| Layer | Tool | What it proves |
|---|---|---|
| API routes | Vitest + supertest against `buildApp()` with the file adapter in a temp folder | Contracts in `API.md`, access rules, error shape |
| Services, middleware | Vitest unit tests with a fake store | Rules in isolation: masking, protections, delay parsing |
| Repository adapters | One shared contract suite run per adapter | File, Mongo and DynamoDB behave identically |
| Web services, interceptors, guards | Angular test runner + `HttpTestingController` | HTTP calls, headers, redirects, state changes |
| Web components | Angular test runner with component harnesses where Material provides them | The four states, role-dependent rendering, forms |
| End to end | Manual demo script (§38); Playwright only if approved (D25) | The whole thing works in a browser |

**Principles**

- **Test the rule, not the implementation.** "A General User never sees an admin-level
  request" is the test, not "the service calls `filter`".
- **Every access rule is tested from outside.** A request with the wrong role or another
  user's token, through the real middleware chain.
- **No sleeping in tests.** Delay tests use fake timers or measure with a small real delay
  (under 200 ms); web tests use fake timers for debounce.
- **Deterministic data.** Tests build their own fixtures; the seed is tested separately.
- **One app per test.** API tests get a fresh app and temp store for every test
  (`useTestContext`), because the rate limiter and stored sign-in times are state that
  otherwise leaks between tests.
- **Proving a guard bites.** A check is removed by hand, inside one command that restores it
  through `trap ... EXIT`, so a hung or interrupted run cannot leave the guard removed.

## §34 API tests

### Auth (`test/api/auth-login.test.ts`, `test/api/auth-session.test.ts`)

- Login succeeds for each seed role with the matching role; response matches `UserView`
  and includes a token that `GET /me` accepts.
- Wrong password, wrong role, unknown user, disabled user: all 401 `INVALID_CREDENTIALS`,
  and the four response bodies are deep-equal.
- `lastLoginAt` changes after a successful login.
- 11th attempt in the window returns 429 with `Retry-After`.
- Missing token, malformed token, bad signature, expired token: 401 `UNAUTHENTICATED`.
- Token for a user who was then disabled, deleted or re-roled: 401 `SESSION_INVALID`.

### Simulation (`test/api/simulation.test.ts`)

- `delay=150` takes at least 150 ms; `Server-Timing` has `delay;dur=150`.
- `delay=0` works; `-1`, `10001`, `abc`, `1.5` are 400 `VALIDATION_FAILED`.
- `fail=true` returns 503 `SIMULATED_FAILURE` after the delay; `fail=yes` is 400.
- `/health` ignores both parameters.
- `SIMULATION_ENABLED=false` turns both into 400 `SIMULATION_DISABLED`.
- A delayed request with a bad token waits, then returns 401.

### Records (`test/api/records.test.ts`)

- General User sees only their own requests, only at `GENERAL` level. Fixture includes an
  `ADMIN`-level request they own and a `GENERAL` request owned by someone else; neither
  appears.
- General User items have no `ownerId`, `ownerName`, `assignee` or `internalNote` keys
  (checked with `not.toHaveProperty`, not `toBeNull`).
- General User sending `accessLevel=ADMIN` gets 403.
- Admin sees every request with every field, including `ownerName`.
- Summary counts match the list totals for both roles; a General User's summary has no
  `ADMIN` key in `byAccessLevel`.
- Paging: `total` correct, `pageSize=51` is 400, last page partial.
- Sorting by priority puts `CRITICAL` first in `desc`.
- Filters by status, priority and `q` combine correctly.

### Admin users (`test/api/admin-users.test.ts`)

- Every admin route returns 403 for a General User token, including with an invalid body
  (role check before validation).
- Create: 201 with `Location`; duplicate is 409 `USER_EXISTS`; weak password is 400.
- Patch: partial updates; empty body is 400; `userId` in body is 400.
- Self: delete, demote, disable own account are each 409 `SELF_ACTION`.
- Last admin is not reachable through one request (API §12), so it is tested in
  `test/unit/user.service.test.ts`: call `UserService` directly with a caller who is not
  in the store and a store holding one active admin; demote, disable and delete each throw
  `LAST_ADMIN`.
- Delete cascades: the user's requests are gone; other users' requests remain.
- `GET /admin/users/:userId` for a missing user is 404 `USER_NOT_FOUND`.

### Cross-cutting (`test/api/contract-shape.test.ts`)

- Every error response in the suites above matches the one error shape (a shared helper
  asserts it).
- A recursive scan of every response body produced by the test run finds no key named
  `passwordHash` or `password`.
- Unknown route is 404 `NOT_FOUND`; a thrown unexpected error is 500 `INTERNAL` with a
  generic message and no stack.
- `X-Request-Id` is present on every response.

## §35 Adapter contract tests

`test/contract/` holds one suite per repository (`user-repository.contract.ts`, and
`record-repository.contract.ts` from Stage 2), each taking a store factory. They are run by
`file.contract.test.ts`, `mongo.contract.test.ts` and `dynamo.contract.test.ts`, which add
any checks specific to their adapter (for the file adapter: restart fidelity, concurrent
writes, no temp file left behind, a corrupt file refused).

- Each test gets a fresh store: a new temp file, a new database name, or a new table name.
- Users: create, duplicate create throws `ConflictError`, find, credentials include the
  hash while `findById` and `list` do not, update, delete, list with filters, sort and
  paging, `countAdmins`.
- Records: scope by owner and access level, paging totals, sort by each allowed field,
  priority by rank, text search, summary counts, `countByOwner`, `deleteByOwner`.
- The mongo and dynamo suites skip with a printed reason when `MONGO_URI` or
  `DYNAMO_ENDPOINT` is unset. CI sets both, so all three always run there.

## §36 Web tests

| Unit | Tests |
|---|---|
| `AuthService` | Login stores token and user; logout clears both; `restore()` with a valid token fills the session; with a 401 clears the token |
| `TokenStorage` | Works when `sessionStorage` throws (private mode) |
| Guards | `authGuard` redirects to `/login` with `returnUrl`; `guestGuard` sends a signed-in user to `/dashboard`; `roleGuard` blocks a General User and allows an Admin |
| `authInterceptor` | Adds the header when signed in; never on `/health` or `/auth/login` |
| `simulationInterceptor` | Appends the group's `delay`; adds `fail=true` once, then disarms; never touches `/health` |
| `errorInterceptor` | Maps the API error shape to `ApiError`; on `SESSION_INVALID` clears the session and navigates to `/login?reason=expired`; does not do that for a failed login or a `SILENT_AUTH` request; an incoming `ApiError` with code `CLIENT_TIMEOUT` comes out identical (same code, status and message), not re-mapped |
| `timeoutInterceptor` | Emits `CLIENT_TIMEOUT` after the configured time (fake timers) |
| `requestLogInterceptor` | Records ok, error, cancelled (unsubscribe before response) and timeout (through the full registered chain, so it fails if the order in §17 regresses); parses `Server-Timing` |
| App initializer | Resolves when health fails; clears a rejected token without navigating; never throws |
| `toLoadState` | Emits loading then loaded; empty when the predicate says so; error on failure |
| `DashboardDataService` | Independent, all-at-once and sequential strategies issue requests in the expected order (inspect `HttpTestingController` between flushes) |
| Login page | Required fields; role selector; demo tag fills the form; server error message shown; submit disabled while pending |
| Records table | General User columns vs Admin columns; masked fields never rendered |
| User form dialog | userId availability: debounced, shows taken and available; create vs edit modes; server 409 shown in the dialog |

## §37 Guard checks

A test that cannot fail protects nothing. At the exit of Stages 2, 5 and 7, each guard
below is removed by hand (or by a temporary patch), the suite is run, and the named test
must go red. Results are recorded in the session note.

| Remove this | This test must fail |
|---|---|
| Role check in `require-role` for admin routes | Admin routes return 403 for a General User |
| Owner scope in `RecordService` | General User sees only their own requests |
| Access-level scope in `RecordService` | General User never sees `ADMIN`-level requests |
| Field masking in `RecordService` | General User items have no restricted keys |
| Role comparison in `AuthService.login` | Wrong role returns 401 |
| User re-load in `authenticate` | Disabled user's token returns `SESSION_INVALID` |
| `SELF_ACTION` check | Admin cannot delete themselves |
| `LAST_ADMIN` check | Last admin cannot be removed |
| Delay clamp | `delay=10001` is 400 |
| `roleGuard` on `/admin` | `roleGuard` blocks a General User |
| Masked columns in the records table | General User columns test |

## §38 Manual demo script

Run against the deployed app at Stage 7, and use it for the demo recording.

1. Open the app cold. The splash shows the server waking, then the login page.
2. Click Kabir's demo tag and sign in: refused with the generic message.
3. Sign in as `riya` with role Admin: refused with the same message.
4. Sign in as `riya`, General User. Point out the verdigris keyline, the access card
   sentence, and the table without owner, assignee or note columns.
5. Open the timeline. Choose "Staggered", reload: panels finish in reverse order. Switch to
   "All at once", reload: nothing appears until the slowest finishes. Switch to "One after
   another".
6. Arm "Fail next" on records and reload: only the table shows the error state; "Try
   again" recovers.
7. Type `/admin/users` in the address bar: redirected with a message, and the network tab
   shows no admin chunk.
8. Sign out, sign in as `meera.admin`, Admin. Brass keyline; the table now shows owners,
   access levels and internal notes.
9. Users: search, filter by role, create `neha` (show the availability check), edit her
   department, disable her, delete her.
10. Try to disable your own account: the controls explain why they are unavailable.
11. Refresh on `/admin/users?role=GENERAL`: session and filters survive.
12. Toggle dark mode; resize to phone width.
