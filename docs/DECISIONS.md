# Decisions

Section §27. One entry per decision: what was chosen, what else was considered, and why.
Entries are numbered D1, D2, ... in the order they were made and are never renumbered. A
reversed decision gets a new entry that names the one it replaces.

## §27 Decision log

### Repository and stack

**D1. One repo, two independent packages: `api/` and `web/`.**
Considered: npm workspaces, Nx. Chosen because each app installs and builds on its own,
which is exactly what Render (`api/`) and Vercel (`web/`) need, and evaluators can run either
half without understanding a workspace tool.

**D2. API types are duplicated in `web/core/models/`, not shared through a package.**
Considered: a `shared/` package imported by both. It would couple the two builds and
complicate both deploys for a handful of interfaces. `docs/API.md` is the contract, and the
rule "change both in the same commit" (CLAUDE.md) plus API tests that assert response shapes
keep them aligned.

**D3. Express with TypeScript for the API.**
Considered: NestJS, Fastify. NestJS looks like Angular and would bring its own module system,
which blurs which structure is mine and which is the framework's; the grading focuses on
Angular, so the API stays small and its layering is visibly hand-built. Fastify is faster,
but Express is what reviewers read most easily.

**D4. zod for request validation and environment parsing.**
One library for both edges. Schemas double as TypeScript types (`z.infer`), so a body shape
is written once. Considered: class-validator (decorator-heavy), Joi (no type inference).

**D5. Native `mongodb` driver, not Mongoose.**
zod already validates shapes at the edge; Mongoose schemas would be a second, drifting copy.
The repository layer is thin enough that the driver is clearer.

**D6. The file adapter stores XML.**
The brief names "local XML", so the file adapter uses it literally, parsed with
`fast-xml-parser`. Writes go to a temp file then `rename`, so a crash never leaves half a
file, and are serialised through an in-process promise queue. Single process only. Not used
on Render, whose disk is wiped on spin-down.

**D7. DynamoDB uses a single-table design with one GSI.**
Users and service requests share a table. A General User's records are a `Query` on
`PK = USER#<id>`, so ownership is enforced by the key itself. Admin listings use
`GSI1PK = TYPE#SR`. Known limitation: offset paging with a total, and sorting on fields other
than `createdAt`, are done in memory after the query. Correct for demo-sized data, wrong at
scale, where the API would switch to cursor paging. Stated in the README.
Considered: two tables (simpler, but misses the point of showing DynamoDB modelling).

**D8. Free hosting with no card: MongoDB Atlas M0, Render free web service, Vercel.**
Considered: AWS Lambda + DynamoDB. Lambda and DynamoDB stay free within their always-free
limits, but since July 2025 new AWS accounts no longer get free API Gateway calls, and signup
needs a card. A Lambda Function URL avoids API Gateway, but the card requirement and a
time-limited free plan are more risk than a take-home needs. DynamoDB knowledge is shown
through the adapter, its contract tests and DynamoDB Local in Docker and CI. Render's
spin-down is handled in the UI (§16) instead of hidden.

### Auth and access

**D9. JWT bearer token in `sessionStorage`.**
Considered: an httpOnly cookie. The SPA (Vercel) and API (Render) are on different sites, so
a cookie would need `SameSite=None; Secure` and is exposed to third-party cookie blocking.
A Vercel rewrite could proxy `/api` to make it same-site, which is the better production
answer and is listed as future scope. `sessionStorage` over `localStorage` so a token does
not outlive the tab. Mitigations for XSS exposure: short TTL (2 hours), Angular's built-in
template escaping, no `innerHTML` bindings, `helmet` headers on the API.

**D10. Every authenticated request re-loads the user.**
Costs one read per request. Buys immediate effect: a disabled or demoted user loses access
on their next call, not up to 2 hours later. A role in the token that differs from the
stored role is treated as an invalid session.

**D11. The role chosen at login must match the stored role; mismatch is a generic 401.**
Considered: letting an admin sign in "as" a General User to see the reduced view. Useful,
but it turns a login claim into a privilege switch and complicates every access test. Listed
as future scope ("view as"). The generic 401, plus a dummy bcrypt compare for unknown users,
keeps login from revealing which accounts exist or which part was wrong.

**D12. `bcryptjs` rather than the native `bcrypt` package.**
Same algorithm and hash format. The native package needs a compiler toolchain on Windows and
can fail to build on hosts; the pure JS version is slower but irrelevant at cost 10 for a
demo. CLAUDE.md's "bcrypt" refers to the algorithm.

**D13. Offset paging with `total`.**
`MatPaginator` needs a total, and evaluators expect "1 to 10 of 18". Cursor paging is the
right call for DynamoDB at scale (see D7) and is noted as future scope.

**D14. Priority sorts by severity through a stored `priorityRank`.**
Alphabetical order (`CRITICAL, HIGH, LOW, MEDIUM`) is a classic plausible-but-wrong result.
Storing a rank keeps the sort in the query for every adapter.

**D15. Deleting a user deletes their service requests.**
Considered: blocking delete while requests exist, or reassigning them. For a demo, cascade
is simplest to explain. The confirm dialog states the count and offers "Disable instead",
which is reversible.

### Simulation

**D16. Delay is a `delay` query parameter on every route, reported in `Server-Timing`.**
The brief asks for "a parameter". A query parameter is visible in the network tab and the
timeline, so an evaluator can see it working. `Server-Timing` lets the timeline separate the
simulated wait from real server work, using a standard header rather than a custom one.
Considered: a custom `X-Delay` header (invisible in URLs), a global server-side setting
(cannot vary per call).

**D17. A `fail=true` parameter returns 503 `SIMULATED_FAILURE`.**
Not in the brief. Without it, error states and "Try again" are unreachable in a demo, and the
four-state rule cannot be shown. Gated by `SIMULATION_ENABLED`.

### Frontend

**D18. Latest stable Angular, standalone components, zoneless, signals.**
The brief's "Angular 12+" is a minimum. NgModules are not used; modularity comes from feature
folders, lazy `loadChildren` routes and route-scoped providers, which is how current Angular
expresses it. The exact version is pinned at Stage 3 and noted in the session note.
Pinned at Stage 3 (2026-10-08): `@angular/core` 22.2.1, `@angular/cli` 22.2.2,
`@angular/material` and `@angular/cdk` 22.2.2, TypeScript 6.0.3 (D31). `package.json` uses
`~22.2` patch ranges; the committed `package-lock.json` with `npm ci` is the real pin.

**D19. Angular Material and CDK, themed from our own tokens.**
Considered: Tailwind, PrimeNG, Bootstrap. Material is Angular's own component library, so it
counts toward "effective use of Angular libraries", and its accessibility work (focus traps,
ARIA on tables and dialogs) comes for free. Theming through `mat.theme` and override mixins
keeps the look custom without fighting the library.

**D20. Signals for state, RxJS for async, no NgRx.**
The app has one session, a few lists and a settings store. NgRx would add actions, reducers
and effects for little gain and would read as boilerplate. Small signal stores with one
writer each give the same discipline.

**D21. The app initializer never rejects.**
A rejected initializer leaves a blank page. Failure to reach the API is recorded as state and
shown on the login page with a retry.

**D22. One `LoadState<T>` type and a `toLoadState` operator for every async view.**
Considered: per-component `isLoading`/`error` flags. One type makes the four states
impossible to forget and identical across panels.

**D23. The latency lab offers three loading strategies.**
Independent streams, `forkJoin`, and `concat`. Showing the same data loaded three ways is a
clearer demonstration of asynchronous handling than a spinner, and it is the creative angle
of the submission.

**D24. Admin mutations are pessimistic.**
Considered: optimistic updates with rollback. Server rules (`LAST_ADMIN`, `SELF_ACTION`) can
reject a change the UI cannot fully predict, so waiting for the server avoids showing a state
that never existed.

### Tooling and quality

**D25. Tests: Vitest and supertest for the API; the Angular CLI's default runner for the web.**
Angular 21 made Vitest the default for new projects, so both halves share a test style.
End-to-end tests (Playwright) are a stretch goal for Stage 7 and need DJK's approval as a new
dependency.

**D26. `pino` with `pino-http` for API logging.**
Structured JSON logs with the request ID on every line. Pretty printing only in development.

**D27. `helmet` and `express-rate-limit`.**
Security headers by default, and a login rate limit (10 per 15 minutes per IP) so the login
endpoint is not an open password-guessing service.

**D28. The records are IT service requests.**
Considered: generic "items", clinic appointments, expense claims. Service requests have an
obvious owner, a believable reason for some to be admin-only (security incidents, access
grants), and fields (assignee, internal note) that make masking meaningful.

**D29. Dependency allowlist.**
Adding anything outside this list needs DJK's approval and a new D-entry.

| Package | Runtime |
|---|---|
| `api` | `express`, `cors`, `helmet`, `express-rate-limit`, `zod`, `jsonwebtoken`, `bcryptjs`, `pino`, `pino-http`, `dotenv`, `fast-xml-parser`, `mongodb`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` |
| `api` dev | `typescript`, `tsx`, `vitest`, `supertest`, `@types/*` for the above, `eslint`, `typescript-eslint`, `prettier`, `rimraf`, `cross-env`, `pino-pretty` |
| `web` | Packages generated by `ng new`, `@angular/material`, `@angular/cdk` |
| `web` dev | Packages generated by `ng new`, `angular-eslint`, `eslint`, `typescript-eslint`, `prettier` |

Fonts load from Google Fonts in `index.html`, not npm: Public Sans (400, 600, 700) and
Material Symbols Outlined, the latter with `icon_names=` listing only the icons the app
uses, so the font stays a few kilobytes (§22).

**D30. `LAST_ADMIN` stays as defence in depth, tested at the service level.**
Found while writing the test plan: with `SELF_ACTION` in place, a single request can never
remove the last admin, because the caller is an active admin who cannot change themselves.
The check is kept for concurrent cross-demotion and for future callerless paths, and is
unit-tested against `UserService` directly. Closing the concurrency race properly needs a
transaction (Mongo) or a conditional write (DynamoDB); that is future scope, not built.

### Pre-code review (2026-10-07)

**D31. TypeScript is pinned to `~6.0` in both packages.**
npm's `latest` is TypeScript 7.0, but `typescript-eslint` 8.71 accepts only `<6.1` and
Angular 22.2's compiler requires `>=6.0 <6.1`. An unpinned install would break lint in
`api/` and the build in `web/`. Both packages pin the same minor so the two halves are
checked by the same compiler. Revisit when typescript-eslint and Angular support 7.
Considered: TypeScript 7 in `api/` only (lint would not run, so the lint gate fails).

**D32. The API is an ES module package.**
`"type": "module"` with `module` and `moduleResolution` set to `NodeNext`. ESM is the
module system Node, tsx, Vitest and the current releases of our dependencies are built
around, and it matches the web app's imports. The cost is explicit `.js` extensions on
relative imports, which `NodeNext` enforces at compile time. Considered: CommonJS (no
extension rules, but legacy for new code, and some dependencies now ship ESM first).

**D33. Web file names follow the Angular 22 CLI, except services.**
Components drop the type suffix (`user-table.ts`, class `UserTable`), which is what the
current style guide and `ng generate` produce. Injectable services keep `.service`
(`auth.service.ts`, class `AuthService`) because "service" names a role a reader looks
for. Every other kind takes its role as a hyphenated word (`auth-guard.ts`,
`auth-interceptor.ts`, `session-store.ts`), as the CLI does for guards and interceptors.
Replaces the `*.component.ts` example in the original CLAUDE.md and the `login.page` and
`user-form.dialog` style in §14. Considered: the old suffixes everywhere (reads dated in a
current Angular codebase, and every generated file would need renaming).

**D34. The shell lives in `app/layout/`, above `core/` and `features/`.**
The shell hosts the latency lab drawer, a feature. In `core/layout` it would make a
singleton folder import a feature. As its own top-level folder, `layout/` is the one place
that composes features. The lab's "Reload dashboard" reaches the dashboard through a
`reloadRequested` signal in `LatencySettingsStore` (core), so neither feature imports the
other. Considered: moving the lab into `core/` (it is a feature with its own UI, not a
singleton), and a shared event bus service (more machinery than one signal).
