# CLAUDE.md

This file guides Claude Code when working in this repository. Keep it under 200 lines. Detail
belongs in `docs/`; this file holds the essentials and points to the rest.

## Session Protocol (read first)

This repo keeps a written memory so every session starts with full context. Maintaining it is
part of the work, not an extra.

1. **At the start of a session**, read this file and the newest note in
   [`docs/sessions/`](docs/sessions/). That note says what changed last time, why, and what is
   still open. [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) maps every section number to
   the doc it lives in. Section numbers are cited from comments and commit messages, so they
   must never be renumbered. Add new sections at the end of a file instead.
2. **After each behavior-changing task**, update the running session note
   `docs/sessions/<YYYY-MM-DD>-<topic>.md` (create it on the first such task of the session):
   what changed, why (the decision, not just the diff), files touched, and how it was verified.
3. **At session end**, make sure the note covers scope, decisions with reasoning, surprises and
   open items. Update any doc whose behavior changed.
4. **Record surprises, not just successes.** A guard that let the wrong role through, a
   subscription that leaked, a test that could not fail. These are worth more than a list of
   what shipped.

## Working practice

- **One commit per substep.** A substep is one bounded change. Stage specific files, never
  `git add -A`.
- **Push once per stage**, only after that stage's exit criteria in `docs/WORKFLOWS.md` §31
  pass and the quality gates below are green. Never push a stage with red tests or lint errors.
- **Commit title:** one line, imperative, no trailing period, no `type(scope):` prefix.
- **Commit description:** written the way you would explain the change to a teammate. What
  changed, why it mattered, what you decided against. Full sentences, not a file list.
- **No em dashes** in docs, README, commit messages, code comments or user-facing strings.
- **Stop and ask before:** adding a dependency, changing an API contract, touching anything
  listed as out of scope, or changing the stage plan. Each accepted change gets a D-entry in
  `docs/DECISIONS.md`.
- **Never edit a test just to make it pass.** If a test was wrong, say why in the session note.

## What this is

**Chatelaine.** In a grand household, the chatelaine was the person who wore the ring of
keys and decided who could enter which rooms. The app does the same: the server holds every
key, and each user sees only what their role opens. Use the name exactly as spelled, with a
capital C in prose and `chatelaine` in identifiers, database names and URLs.

A take-home: an Angular single-page app with a TypeScript API behind it. Users log in with
user ID, password and role (**General User** or **Admin**), see their profile and a table of
records scoped to their access level, and admins manage users. Every API except `/health`
accepts a delay parameter so the app can show asynchronous loading honestly. The brief is summarised in
`docs/ARCHITECTURE.md`.

**The evaluators grade:** effective use of Angular and its libraries, API and cloud
knowledge, UI quality, and **clean, original code architecture.** Code copied from GitHub is
rejected. Every design choice should be easy to defend in a review.

**The thesis:** the server is the only authority on access. The UI hides what a role cannot
use, but hiding is a convenience. Every role and ownership rule is enforced in the API, and a
test proves it by calling the API directly with the wrong token.

**Out of scope on purpose:** self sign-up, password reset, email, refresh-token rotation,
i18n, SSR, paid cloud services. These go in the README's future scope section.

## Stack

**web/:** Angular (latest stable, pinned in `package.json`), standalone components with
lazy-loaded feature routes, Angular Material and CDK with a custom theme, RxJS for streams,
signals for component state, typed reactive forms. **api/:** Node 24+ with Express 5 and
TypeScript as ES modules, zod for validation, bcrypt, JWT. **TypeScript is pinned to
`~6.0`** in both packages (D31). **Storage:** one repository contract with three
adapters chosen by `STORAGE=file|mongo|dynamo`. **Hosting (free, no card):** MongoDB Atlas
M0, Render free web service, Vercel or Netlify for the SPA, DynamoDB Local in Docker.
Rationale for each choice: `docs/DECISIONS.md`.

## Commands

```
cd api && npm ci && npm run seed && npm run dev   # http://localhost:3000/api/health
cd web && npm ci && npm start                     # http://localhost:4200
docker compose up -d dynamodb                     # only needed for STORAGE=dynamo
npm run lint && npm run format:check              # run in both api/ and web/
npm run typecheck && npm test                     # run in both api/ and web/
```

Environment lives in `api/.env` (template: `api/.env.example`): `STORAGE`, `MONGO_URI`,
`DYNAMO_ENDPOINT`, `JWT_SECRET`, `CORS_ORIGIN`. Never commit `.env`. npm scripts must work on
Windows and Linux: no `rm -rf`, no `export`, use `rimraf` and `cross-env` if needed.

## Architecture in one paragraph

**The API** is layered: routes declare paths and middleware, controllers translate HTTP to
calls, services hold the rules (ownership, masking, role checks), repositories talk to
storage. Only repositories import a storage SDK. A `delay` middleware reads `?delay=ms`
before any handler runs. **The SPA** has `core/` (auth, interceptors, guards, app
initializer, singleton services), `shared/` (presentational components and pipes),
`layout/` (the shell, which composes the others), and lazy-loaded `features/` (`auth`,
`dashboard`, `admin`, `latency-lab`). On boot, the app initializer pings
`/health` (Render's free tier can take a minute to wake) and restores the session from
`/me`. An interceptor attaches the token, appends the delay the user chose in the latency
panel, and logs each request's timing for the waterfall view. Full detail:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Clean code rules (both apps)

- **TypeScript strict mode on.** No `any`; use `unknown` and narrow. No non-null `!` without a
  comment saying why it is safe.
- **Lint and format are gates, not suggestions.** ESLint (angular-eslint, typescript-eslint)
  and Prettier. Zero warnings before a commit.
- **Small units.** Functions do one thing and stay short. Files stay under about 250 lines;
  split before they grow past that. Prefer early returns over nesting. No nested ternaries.
- **Names say what, not how.** Booleans read as questions (`isAdmin`, `hasRecords`).
- **Web file names (D33).** Components drop the suffix, as the CLI generates them:
  `user-table.ts`, class `UserTable`. Injectable services keep `.service`:
  `auth.service.ts`, class `AuthService`. Every other kind takes its role as a hyphenated
  word: `auth-guard.ts`, `auth-interceptor.ts`, `session-store.ts`.
- **No magic values.** Roles, routes, limits and storage keys come from constants or enums.
- **No dead code.** No commented-out blocks, no `console.log` (the API uses its logger), no
  `TODO` that is not also an open item in the session note.
- **Comments explain why,** never restate what the code does.
- **Originality.** Every file is written for this project. Do not paste from tutorials,
  starter kits, admin templates or other repos. CLI and schematic output is fine.

## Conventions to preserve when editing

**API**
- **Routes stay thin.** No business rule lives in a route or controller.
- **Validate at the edge.** Every body, param and query is parsed by a zod schema. Invalid
  input returns 400 before a service is called.
- **One error shape:** `{ error: { code, message, details? } }`, produced only by the central
  error middleware. Services throw typed errors; they never write responses.
- **Every adapter passes the same contract test suite.** A new storage backend is done when
  the shared repository tests pass against it, not when it compiles.
- **Login checks the chosen role against the stored role.** A mismatch fails with the same
  generic 401 as a wrong password, so the response never reveals which part was wrong.
- **Masking happens in the service.** A General User never receives restricted fields, not
  even as null. Records are filtered by owner in the query, not after loading.
- **Admins cannot delete or demote themselves,** and the last admin can never be removed.
- **Passwords are bcrypt-hashed and never leave the repository layer.**
- **Delay is validated** to 0..10000 ms. Anything else is a 400, never clamped or silently
  defaulted. `/health` ignores it.

**Web**
- **Components never inject `HttpClient`.** HTTP lives in services; components ask services.
- **OnPush everywhere.** Container components own data; presentational components take
  inputs and emit outputs and hold no services.
- **No bare `.subscribe()` in components.** Use the `async` pipe or `toSignal`. When a
  subscription is unavoidable, end it with `takeUntilDestroyed`.
- **Functional guards and interceptors.** `authGuard` and `roleGuard` protect routes, and
  `admin` is lazy-loaded so a General User never downloads its code.
- **Every async view has four states:** loading (skeleton, not a spinner), loaded, empty,
  error with retry. Panels load independently; one slow call never blocks another.
- **Design tokens only.** Colors, spacing and radii come from `styles/_tokens.scss`. Light
  and dark themes switch through CSS variables. No hard-coded hex in components.
- **Accessible by default:** labelled inputs, keyboard reachable actions, visible focus,
  AA contrast, usable at 360px wide.
- **Frontend models mirror `docs/API.md`.** Change both in the same commit.

## Testing

Unit tests for every service and guard, `HttpTestingController` for web services, supertest
for API routes. Every access rule has a test that calls the API with the wrong role or
another user's token and expects a refusal. If removing a check does not turn a test red,
that test is not protecting anything. Details: `docs/TEST_PLAN.md`.

## Status

Stages 0 to 6 (docs, API foundation, data and admin API, web foundation, dashboard, admin,
latency lab) are done and pushed. Stage 7 (ship) is in progress: everything that needs no
account is done and committed, and the deploy waits on DJK. See
`docs/sessions/2026-10-10-stage7.md`.
Stages and exit criteria: `docs/WORKFLOWS.md` §31.
Open questions are tracked in the newest session note, not here.

## Docs

| File | What it is |
|---|---|
| [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) | Index. Maps every § number to its file |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Brief, scope, structure, data model, request flows |
| [`docs/API.md`](docs/API.md) | Endpoints, request and response shapes, error codes, delay |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Routing, state, interceptors, initializer, latency lab |
| [`docs/UI.md`](docs/UI.md) | Design tokens, themes, components, loading and empty states |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Design decisions with alternatives considered |
| [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) | Setup, deploy, build stages with exit criteria, definition of done |
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Per-module test requirements, access-rule tests, contract tests |
| [`docs/sessions/`](docs/sessions/) | Dated notes: what changed, why, and what nearly broke |
