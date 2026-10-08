# Frontend

Sections §14 to §20. Visual design lives in [`UI.md`](UI.md); this file covers structure,
data flow and behaviour.

## §14 Structure and routing

The app uses standalone components, zoneless change detection and signals, on the latest
stable Angular release (D18). "Modular" here means three things an evaluator can check:
folders with clear boundaries, lazy routes that become separate chunks, and providers
scoped to where they are used.

```
app/
  core/          singletons, imported by app.config.ts, layout and features
    auth/        auth.service, user.service, session-store, token-storage, auth-guard,
                 role-guard, guest-guard
    http/        *-interceptor files, api-interceptors (the ordered chain), api-paths,
                 api-base-url, api-error, http-context-tokens
    init/        app-initializer, boot-status
    latency/     latency-settings-store, request-log-store
    notices/     notice-store (messages eager code posts; the shell shows them)
    routing/     app-paths (path constants), page-title-strategy
    storage/     web-storage (session and local storage that never throw), storage-keys
    models/      API types mirroring docs/API.md
    theme/       theme.service (light, dark, system)
  shared/        presentational only: inputs and outputs, no app services
    ui/          role-badge, access-chip, status-chip, priority-mark, skeleton,
                 empty-state, error-state, confirm-dialog
    load-state/  LoadState type and the toLoadState operator (§18)
  layout/        shell (top bar, nav, lab drawer host, router outlet), not-found-page
  features/
    auth/        login-page
    dashboard/   dashboard-page, profile-panel, summary-panel, records-panel,
                 records-table, dashboard-data.service
    admin/       admin.routes, users-page, user-table, user-form-dialog,
                 delete-user-dialog, admin-users.service
    latency-lab/ latency-lab-panel, request-timeline, strategy-picker
```

**File names (D33).** Components have no suffix (`login-page.ts`, class `LoginPage`), as
the CLI generates them. Injectable services keep `.service` (`auth.service.ts`, class
`AuthService`). Every other kind takes its role as a hyphenated word: `auth-guard.ts`,
`auth-interceptor.ts`, `session-store.ts`. Route files stay `*.routes.ts`.

**Import rules.** `shared/` imports nothing from `core/`, `layout/` or `features/`.
`shared/` components inject no app services; the dialog framework's own tokens
(`MatDialogRef`, `MAT_DIALOG_DATA`) are allowed, since a dialog cannot work without them.
Features never import from each other; anything two features need moves to `shared/` or
`core/`. `layout/` sits above both and is the only place that composes features: the shell
hosts `features/latency-lab`'s panel (D34). `features/admin` is imported only through
`loadChildren`.

### Routes

| Path | Guards | Loads | Notes |
|---|---|---|---|
| `/login` | `guestGuard` | `loadComponent` | Signed-in users are sent to `/dashboard` |
| `/` | | | Redirects to `/dashboard` |
| `/dashboard` | `authGuard` (`canMatch` on the shell route) | `loadComponent`, inside the shell (itself `loadComponent`) | |
| `/admin` | `authGuard`, `roleGuard(ADMIN)` | `loadChildren` (own chunk) | Child: `/admin/users` |
| `**` | `authGuard` | `loadComponent`, inside the shell | Not-found page with a link to the dashboard. Inside the shell so a signed-in user keeps the navigation; a signed-out user is sent to sign in first |

- **Every page is its own chunk.** The sign-in page needs Material's form controls and the
  shell needs its menus; a visitor sees one of them first, so neither is in the initial
  bundle (463 kB raw, 118 kB transferred at Stage 3, inside the 500 kB budget). The boot
  splash (§16) stays over the page until the first navigation settles, so it covers the
  chunk load instead of a blank frame. Initial navigation is the router's default
  (non-blocking) on purpose: `withEnabledBlockingInitialNavigation()` runs as a second app
  initializer alongside the boot sequence, so the guards would decide before the session
  was restored.
- `authGuard` reads the session signal. No session: redirect to
  `/login?returnUrl=<path and query>`. All guards are `canMatch`, so a refused user never
  matches the routes beneath, and the full target comes from `router.currentNavigation()`.
  A stored token alone is not a session: `/me` must have confirmed it (§16).
- `roleGuard` is a factory taking the allowed roles. A General User who types `/admin` is
  sent to `/dashboard` with a snackbar: "User management is for admins." The chunk is never
  requested, because `canMatch` runs before `loadChildren` (verified in Stage 3). The guard
  posts the message to `NoticeStore` and the shell shows the snackbar: guards are eager,
  and opening a snackbar from one put Material's overlay (about 150 kB) into the initial
  bundle (Stage 4).
- After login, the app navigates to `returnUrl` if it is a safe internal path, otherwise
  `/dashboard`.
- Route titles are set with the router's `title` property and a `TitleStrategy` that
  appends " | Chatelaine".

`app/testing/` holds spec-only fixtures and `provideTestHttp()` (HttpClient with the real
interceptor chain). It is excluded from the app build.

## §15 Services and state

**Rule of thumb:** RxJS for anything that happens over time (HTTP, debounced input,
cancellation), signals for state a template reads. `toSignal` and `toObservable` bridge the
two. No NgRx (D20).

| Service | Scope | Holds |
|---|---|---|
| `SessionStore` | root | `token`, `user`, computed `isAdmin`, `isSignedIn`. The only writer of session state |
| `TokenStorage` | root | Read, write, clear the token in `sessionStorage` (D9). Wrapped in try/catch |
| `AuthService` | root | `login()`, `logout()`, `restore()`. Talks to `/auth/*` and `/me`, writes to `SessionStore` |
| `UserService` | root | `getProfile()` for `/me`. Named to match the brief's "User Service" |
| `DashboardDataService` | dashboard route | `profile$`, `summary$`, `records$(query)`, the loading strategy (§19) |
| `AdminUsersService` | admin route | List, get, create, update, delete, `isUserIdTaken()` |
| `LatencySettingsStore` | root | Per-group delay, fail-next flags, strategy, timeout. All of it persists to `sessionStorage`, saved on every change. An armed fail-next flag stays armed, across reloads too, until a request in its group takes it (changed in Stage 4, so a reload can be failed on purpose). Also a `reloadRequested` counter signal: the lab bumps it, `DashboardDataService` reacts to it, so the two features never import each other (D34) |
| `RequestLogStore` | root | Last 40 request entries for the timeline |
| `ThemeService` | root | `light`, `dark` or `system`; sets `data-theme` on `<html>` |

`DashboardDataService` and `AdminUsersService` are provided on their routes, not in root,
so they are created with the feature and destroyed with it.

## §16 App initializer

Registered with `provideAppInitializer`. Its job is to make the first rendered screen
correct: no flash of the login page for a signed-in user, and no blank screen while
Render's free instance wakes up (about a minute after 15 idle minutes).

**`index.html` holds a static splash** (plain HTML and CSS, no Angular) with an element
`#boot-status`. `BootStatus` updates that element's text through `DOCUMENT` while the
initializer runs. The splash is a fixed overlay outside `<app-root>`, and
`provideBootSplash()` removes it when the first navigation settles (ends, errors, or is
cancelled other than by a redirect), so it also covers the first page's lazy chunk.

Steps:

1. **Wake the API.** `GET /health` with a 5 second timeout, retried every 3 seconds for up
   to 90 seconds. Splash text moves through "Connecting to the server", then after 4
   seconds "Waking the server. Free hosting sleeps when idle, this can take up to a
   minute." with an elapsed-seconds counter.
2. **Restore the session.** If `TokenStorage` has a token, call `GET /me`. Success fills
   `SessionStore`. A 401 clears the token silently: the request carries the `SILENT_AUTH`
   `HttpContextToken`, which tells `errorInterceptor` not to redirect to
   `/login?reason=expired` (§17). No route has resolved yet, and a fresh visitor with a
   stale token should simply see the login page.
3. **Resolve.**

**The initializer never rejects.** A rejected initializer leaves a blank page. If the
health check gives up, it records `serverReachable = false` and resolves; the login page
then shows "The server is not responding." with a "Try again" button that re-runs step 1.

The simulation interceptor skips `/health` and the boot-time `/me` restore (it carries
`SKIP_SIMULATION` as well as `SILENT_AUTH`), so boot always measures the real server. Before
this (found at the Stage 4 exit), an armed profile failure was taken by the restore and the
reload landed on the login page instead of showing the profile panel's error, and a profile
delay held the splash. The request log records boot calls too, so the timeline shows the
cold start when the lab is first opened.

## §17 HTTP interceptors

Functional interceptors, registered in this order with `withInterceptors([...])`. Order
matters: the last one sits closest to the network.

| # | Interceptor | Does |
|---|---|---|
| 1 | `apiUrlInterceptor` | Prefixes relative `api/...` URLs with `environment.apiBaseUrl` |
| 2 | `authInterceptor` | Adds `Authorization: Bearer` when a token exists, except on `/health` and `/auth/login`. Only URLs under `apiBaseUrl` get it, so the token never reaches another origin |
| 3 | `simulationInterceptor` | Maps the URL to an endpoint group and appends `delay` and, if armed, `fail=true` from `LatencySettingsStore`. Disarms fail-next after use. Leaves alone any request carrying `SKIP_SIMULATION` (the boot restore, §16) |
| 4 | `requestLogInterceptor` | Records start, end, status, outcome and the `Server-Timing` split in `RequestLogStore`. Classifies an `ApiError` with code `CLIENT_TIMEOUT` as `timeout`, any other `ApiError` as `error`, and an unsubscribe with neither as `cancelled` |
| 5 | `errorInterceptor` | Converts `HttpErrorResponse` to `ApiError { status, code, message, details }`. An error that is already an `ApiError` (the `CLIENT_TIMEOUT` from #6) passes through unchanged. On 401 `UNAUTHENTICATED` or `SESSION_INVALID`, clears the session and navigates to `/login?reason=expired&returnUrl=<current path>`, so signing in again returns the user to where they were, except on login and on requests carrying `SILENT_AUTH` (§16) |
| 6 | `timeoutInterceptor` | Applies `timeout({ each: settings.timeoutMs })` (default 12 s). `each`, not `first`: HttpClient emits its sent event at once, which would satisfy `first`. Emits `ApiError` with code `CLIENT_TIMEOUT` |

**Why this order.** The request log must sit outside the timeout. If the timeout were
outside the log, a timeout would unsubscribe from the log's stream, and the log would see a
request that ended with neither a response nor an error: it would record `cancelled`,
never `timeout`. With the log at #4 it receives the timeout as an error and can name it.

**Endpoint groups** (used by the lab and the log):

| Group | Matches |
|---|---|
| `auth` | `/auth/*` |
| `profile` | `/me` |
| `summary` | `/records/summary` |
| `records` | `/records` |
| `admin` | `/admin/*` |
| `health` | `/health` (never delayed) |

**Request log entry:**

```ts
interface RequestLogEntry {
  id: number;
  group: EndpointGroup;
  method: string;
  url: string;              // path and query, no host
  startedAt: number;        // performance.now()
  endedAt: number | null;   // null while in flight
  outcome: 'pending' | 'ok' | 'error' | 'cancelled' | 'timeout';
  status: number | null;
  serverDelayMs: number | null;   // from Server-Timing "delay"
  serverWorkMs: number | null;    // from Server-Timing "app"
}
```

Only requests to `apiBaseUrl` are logged. `ApiError` carries the parsed `Server-Timing`
of a failed response, because the log sits outside the error interceptor and would
otherwise lose the split for errors (a simulated failure after a delay still shows its
delay segment).

`cancelled` is detected with `finalize` when neither a response nor an error arrived,
which is what happens when `switchMap` drops an in-flight request.

## §18 Load states

Every async view follows one type:

```ts
type LoadState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; data: T; isRefreshing: boolean }
  | { status: 'empty'; isRefreshing: boolean }
  | { status: 'error'; error: LoadFailure };   // { status, code, message }; ApiError fits it
```

`LoadFailure` is declared in `shared/load-state/` because `shared/` cannot import `core/`;
`ApiError` satisfies it structurally.

`toLoadState(isEmpty?)` is an RxJS operator in `shared/load-state/` that starts with
`loading`, maps data to `loaded` or `empty`, and catches errors into `error`. Components
switch over `status` with `@switch` in the template. Each state has one visual (§24):
skeleton, content, empty state with an action, error state with "Try again".

Retry is a `Subject<void>` per panel feeding `switchMap`, so pressing "Try again" twice
cancels the first attempt instead of racing it.

Panels keep showing their previous data while a refresh is in flight (a thin progress bar
on the panel edge), so paging or sorting the table does not flash a skeleton every time.
Only the first load shows the skeleton. This is a second operator, `keepDataWhileRefreshing()`,
applied after the `switchMap`: a new `loading` becomes the previous `loaded` or `empty`
state with `isRefreshing: true`. It is on `empty` too, so refreshing an empty result does
not flash the skeleton either. **A refresh that fails replaces the view with the error
state**: rows that no longer match the URL are never left on screen looking current, and
the load after an error shows the skeleton again.

## §19 Latency lab

A drawer on the right of the shell (a bottom sheet under 720px), opened from the top bar.
It turns the brief's delay requirement into something an evaluator can try.

**Controls**

- **Delay per endpoint group:** a slider from 0 to 10000 ms for `profile`, `summary`,
  `records`, `admin`. Values show in ms with tabular figures.
- **Presets:** "Instant" (all 0), "Realistic" (profile 300, summary 900, records 1600,
  admin 500), "Slow network" (2500 to 4000), "Staggered" (profile 3000, summary 1500,
  records 500, so panels finish in reverse order). Presets set the sliders; they are not
  separate state.
- **Fail the next request:** a toggle per group. The next call in that group carries
  `fail=true`, then the toggle turns itself off.
- **Loading strategy** for the dashboard:
  - **Independent** (default): three streams, each panel renders as soon as its own data
    arrives.
  - **All at once:** `forkJoin`. Nothing renders until the slowest call finishes, and one
    failure fails all three.
  - **One after another:** `concat`. Profile, then summary, then records.
- **Client timeout:** 12 s by default, adjustable from 2 to 20 s, so a 10 s delay with a
  5 s timeout shows the timeout path.
- **"Reload dashboard":** bumps `LatencySettingsStore.reloadRequested` (§15), which
  re-triggers the dashboard streams through `switchMap`. Pressing it twice quickly shows
  cancelled bars.

**Request timeline** (the drawer's main view)

- One row per request, newest at the bottom, last 40 kept.
- The x-axis is time since the first request in the current view, with a "Clear" action.
- Each bar is split into three segments: simulated delay (from `Server-Timing`), server
  work, and network plus browser (the remainder). Pending bars grow live and are animated
  only while pending.
- Outcome is shown by bar treatment and a text label, never color alone: solid for ok,
  outlined with a status code for error, struck through for cancelled, dashed end for
  timeout.
- Rows are focusable; focus or hover shows method, path, status and the three durations.

**Why it exists:** the three strategies make the trade-off concrete. Independent loading
gives the fastest first paint; all-at-once is simpler but as slow as its slowest call and
as fragile as its weakest; sequential is what accidental `await`-in-a-row code does.
The README's async section points evaluators here.

## §20 Admin screens

`/admin/users` is a lazy route with its own `AdminUsersService`.

**Users table**

- Server-side paging, sorting and filtering through `MatPaginator`, `MatSort` and filter
  controls. Query state lives in the URL (`?q=&role=&status=&page=&sort=&order=`), so a
  refresh or a shared link keeps the view.
- Search input is debounced 300 ms with `distinctUntilChanged`; the request uses
  `switchMap`, so typing never shows stale results.
- Columns: user (display name with userId beneath), role badge, status, department,
  last sign-in (relative, with the exact time on hover), actions.
- The signed-in admin's own row shows "You" and has Delete, role change and Disable
  unavailable, each with a tooltip saying why. The server enforces the same rule (§12).

**Create and edit dialog** (`user-form.dialog`, one component, two modes)

- Typed reactive form. Fields: userId (create only), display name, email, department,
  role (segmented control), status (edit only), password (required on create; on edit
  a "Set a new password" toggle reveals it).
- **userId availability** is an async validator: debounce 400 ms, then
  `AdminUsersService.isUserIdTaken()`, which reads 404 as available. The field shows
  "Checking", "Available" or "Already taken".
- Submit is disabled while invalid or pending. Server errors (409 `USER_EXISTS`,
  `SELF_ACTION`, and `LAST_ADMIN` if it ever occurs) are shown inside the dialog, next to
  the field they concern where possible.
- Mutations are pessimistic: the dialog shows progress and closes only on success (D24).
  On success the table refreshes and a snackbar confirms: "User created", "Changes saved".

**Delete**

- The confirm dialog fetches `GET /admin/users/:userId` first and states the impact:
  "Delete Arjun Rao? Their 7 service requests will be deleted too. This can't be undone."
- The primary action reads "Delete user". "Disable instead" is offered as a secondary
  action, because disabling is reversible.
