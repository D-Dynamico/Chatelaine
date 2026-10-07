# Architecture

Sections §1 to §7. Section numbers are global across `docs/` and never renumbered; see
[`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md).

## §1 Brief

The take-home asks for a single-page application in **Angular 12 or later**, with Node or
TypeScript behind it:

1. **A login page** with user ID, password and role. The role is either "General User" or
   "Admin". A dummy API stores and returns users, backed by local XML, MongoDB or AWS
   DynamoDB.
2. **A logged-in page** that shows the user's details and calls an API for a list of records
   belonging to that user, displayed as a table. Dummy records should make the user's access
   level visible.
3. **For admins, a way to manage the users** in the database.
4. **A delay mechanism in the API, driven by a parameter,** so the logged-in page can show
   asynchronous processing on load. Use a user service and app-load logic to keep the code
   modular.

**Graded on:** effective use of Angular and its libraries, knowledge of APIs and cloud
frameworks, UI quality, and a creative design with clean architecture. Code copied from
GitHub is rejected.

## §2 Interpretation and scope

The brief is loosely worded, so these readings are stated here and in the README.

- **"Role" at login is a claim the server checks.** The user picks a role, and the API
  accepts the login only if it matches the stored role. A mismatch fails exactly like a wrong
  password (D11).
- **"Records for the user" are service requests** raised by employees: laptop repairs,
  access requests, network faults (D28). Each request has an **access level**, `GENERAL` or
  `ADMIN`. A General User sees only their own `GENERAL` requests, without restricted fields.
  An Admin sees every request with every field. This is how the table "shows the access level
  of the user".
- **"Storage can be XML, MongoDB or DynamoDB" becomes all three,** behind one repository
  contract, selected by `STORAGE=file|mongo|dynamo` (§6). The file adapter writes XML because
  the brief names XML.
- **"Delay using a parameter" is a `delay` query parameter on every API call** (§9), plus a
  latency lab in the UI that sets it per endpoint and draws the resulting request timeline
  (§19). A `fail` parameter makes error states reachable on demand.
- **"User service and app load" means a `UserService`/`AuthService` pair and an app
  initializer** that wakes the API and restores the session before the first screen renders
  (§16).
- **"Modularize" means feature folders with lazy-loaded routes.** The admin area is a
  separate chunk that General Users never download (D18).

**Out of scope:** self sign-up, password reset by email, refresh tokens, i18n, server-side
rendering, any paid cloud service. Listed in the README's future scope.

## §3 Repository layout

```
chatelaine/
  CLAUDE.md
  README.md
  docker-compose.yml          mongo and dynamodb-local for adapter work and contract tests
  render.yaml                 Render blueprint for the API (free plan)
  .github/workflows/ci.yml    lint, typecheck, test, build for both apps
  docs/                       this folder
  api/
    .env.example
    src/
      main.ts                 reads config, creates the store, builds the app, listens
      app.ts                  buildApp(deps): Express app factory, used by tests too
      config.ts               env parsed and validated with zod, fails fast at boot
      domain/                 types, enums, constants, typed errors
      schemas/                zod schemas for bodies, params and queries
      middleware/             request-context, simulation (delay and fail), authenticate,
                              require-role, validate, login-rate-limit, error-handler
      routes/                 health, auth, me, records, admin-users
      controllers/            HTTP in, service call, HTTP out
      services/               auth, token, password, user, record (all rules live here)
      repositories/
        contracts.ts          UserRepository, RecordRepository, Store
        file/                 XML adapter
        mongo/                MongoDB adapter
        dynamo/               DynamoDB adapter
        create-store.ts       picks the adapter from config
      seed/                   deterministic seed data and the seed command
      lib/                    logger, clock, runtime helpers (.env loading, version)
      types/                  Express augmentation: typed res.locals and req.auth
    test/
      api/                    supertest suites per route group
      contract/               one repository suite, run against every adapter
      unit/                   services and middleware
  web/
    src/
      index.html              holds the static boot splash (§16)
      styles/                 _tokens.scss, _theme.scss, styles.scss
      environments/           apiBaseUrl per environment
      app/
        app.config.ts         providers: router, http + interceptors, initializer, theme
        app.routes.ts
        core/                 auth, http, init, latency, models, theme
        shared/               presentational components, pipes, load-state helper
        layout/               shell: top bar, nav, lab drawer host, router outlet (D34)
        features/
          auth/               login page
          dashboard/          dashboard page and its three panels
          admin/              lazy: user management
          latency-lab/        lab panel and request timeline
```

Module boundaries are enforced by convention and review: API layers in §4, web folders in
§14.

**API file names** carry their layer, so a file's job is visible from its name:
`auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.schema.ts`. Middleware,
`lib/` and repository files are plain kebab-case (`request-context.ts`,
`file-user-repository.ts`).

## §4 API layers

A request passes through these layers in order. Each one has a single job.

| Layer | Job | May import |
|---|---|---|
| `middleware/request-context` | Request ID (`X-Request-Id`), start time, child logger, `Server-Timing` (wraps `res.writeHead`, §9) | `lib/` |
| `middleware/simulation` | Simulation parameters, `delay` then `fail` (§9). Mounted after `/health` | `domain/`, `schemas/` |
| `middleware/authenticate` | Verify JWT, re-load user, attach `req.auth` | `services/` |
| `middleware/require-role` | 403 unless `req.auth.role` is allowed | `domain/` |
| `middleware/validate` | Parse body, params, query with a zod schema; store the result in `res.locals.validated` | `schemas/` |
| `routes/` | Declare paths and middleware chains | `controllers/`, `middleware/` |
| `controllers/` | Map request to a service call and the result to a response | `services/`, `domain/` |
| `services/` | Business rules: credentials, ownership, masking, admin protections | `repositories/contracts`, `domain/` |
| `repositories/<adapter>/` | Storage only. No rules | the storage SDK, `domain/` |
| `middleware/error-handler` | Map typed errors to the one error shape (§13) | `domain/` |

Rules that follow from the table:

- **Only repositories import a storage SDK** (`mongodb`, `@aws-sdk/*`, `fast-xml-parser`).
- **Services never see `req` or `res`.** They take plain inputs and throw `AppError`
  subclasses. Controllers never contain an `if` about roles.
- **`buildApp(deps)` takes the store and config as arguments,** so API tests run against the
  file adapter in a temp folder without touching the network. Anything with per-process
  state, such as the login rate limiter, is created inside `buildApp`, so each test app
  starts fresh.
- **Express 5 specifics.** `req.query` is a getter and cannot be reassigned, so validated
  input is read from `res.locals.validated` through a typed helper, never from `req`. The
  unknown-route 404 is a final `app.use()`, because Express 5 path syntax rejects a bare
  `*`. Rejected promises in async handlers reach the error middleware without a wrapper.
- **The API is an ES module package** (`"type": "module"`, `module: NodeNext`), D32.

## §5 Data model

### User

| Field | Type | Notes |
|---|---|---|
| `userId` | string | Login ID. 3 to 32 chars, `[a-z0-9._-]`, unique, immutable |
| `displayName` | string | 1 to 60 chars |
| `email` | string | Valid email, not unique (dummy data) |
| `department` | string | Free text, 1 to 40 chars |
| `role` | `GENERAL` \| `ADMIN` | |
| `status` | `ACTIVE` \| `DISABLED` | Disabled users cannot log in; their sessions end on the next call |
| `passwordHash` | string | bcrypt, cost 10. Exists only inside the repository layer |
| `createdAt`, `updatedAt` | ISO 8601 string | |
| `lastLoginAt` | ISO 8601 string \| null | Set on successful login |

The repository returns `User` without the hash. Login uses a separate
`findCredentials(userId)` that returns `{ user, passwordHash }`, so the hash cannot leak
through any listing method by accident.

### ServiceRequest (the "records")

| Field | Type | Visible to General User |
|---|---|---|
| `id` | string, `SR-1001` style | yes |
| `ownerId` | string, a `userId` | no (always themselves) |
| `title` | string | yes |
| `category` | `HARDWARE` \| `SOFTWARE` \| `ACCESS` \| `NETWORK` \| `FACILITIES` | yes |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` | yes |
| `status` | `OPEN` \| `IN_PROGRESS` \| `RESOLVED` \| `CLOSED` | yes |
| `accessLevel` | `GENERAL` \| `ADMIN` | yes (always `GENERAL` for them) |
| `assignee` | string \| null | **no** |
| `internalNote` | string \| null | **no** |
| `createdAt`, `updatedAt` | ISO 8601 string | yes |

Adapters also store `priorityRank` (1 to 4) so sorting by priority follows severity, not
the alphabet (D14), and `statusRank` (1 to 4) so sorting by status follows the workflow
from `OPEN` to `CLOSED` for the same reason. Ties break on `id` in the same direction, and
strings compare by code unit (MongoDB's default), so every adapter returns identical pages.

**Visibility rule, applied by `RecordService`:**

- General User: scope is `ownerId = self AND accessLevel = GENERAL`. The scope is passed to
  the repository so the filter runs in the query. `ownerId`, `assignee` and `internalNote`
  are removed from each item: the keys are absent, not null.
- Admin: scope is everything. All fields returned.

### Seed data

`npm run seed` writes the same data to whichever adapter `STORAGE` selects. It is
deterministic (a fixed-seed generator in `seed/`), so tests and screenshots are stable.

| userId | Role | Status | Purpose |
|---|---|---|---|
| `meera.admin` | ADMIN | ACTIVE | Main admin demo account |
| `vikram.admin` | ADMIN | ACTIVE | Second admin, so one admin can be edited by another |
| `riya` | GENERAL | ACTIVE | General User with many requests, some `ADMIN`-level (hidden from her) |
| `arjun` | GENERAL | ACTIVE | General User with few requests |
| `sara` | GENERAL | ACTIVE | General User with no requests, shows the empty state |
| `kabir` | GENERAL | DISABLED | Shows that disabled accounts cannot log in |

All demo passwords are `Chatelaine@2026`, listed in the README and on the login page. Around
60 service requests are spread across `riya`, `arjun`, the admins and `kabir`, roughly one in
five at `ADMIN` access level.

## §6 Storage adapters

`repositories/contracts.ts` defines the only interface services know about:

```ts
interface Store {
  users: UserRepository;
  records: RecordRepository;
  init(): Promise<void>;      // create file, indexes or table if missing
  reset(): Promise<void>;     // used by seed and by contract tests
  close(): Promise<void>;
}

interface UserRepository {
  findById(userId: string): Promise<User | null>;
  findCredentials(userId: string): Promise<{ user: User; passwordHash: string } | null>;
  list(query: UserListQuery): Promise<Page<User>>;
  countAdmins(filter: { status?: UserStatus }): Promise<number>;
  create(input: NewUser): Promise<User>;              // throws ConflictError on duplicate
  update(userId: string, patch: UserPatch): Promise<User>;
  delete(userId: string): Promise<void>;
  touchLastLogin(userId: string, at: string): Promise<void>;
}

interface RecordRepository {
  list(scope: RecordScope, query: RecordListQuery): Promise<Page<ServiceRequest>>;
  summary(scope: RecordScope): Promise<RecordSummary>;
  countByOwner(ownerId: string): Promise<number>;
  deleteByOwner(ownerId: string): Promise<number>;
  insertMany(items: ServiceRequest[]): Promise<void>; // seed only
}
```

This is a design sketch for the docs. The real signatures live in code and must keep the
same responsibilities.

| Adapter | Storage | Notes |
|---|---|---|
| `file` | One XML file, default `api/data/chatelaine.xml` | Parsed with `fast-xml-parser`. Writes go to a temp file and are renamed into place, and are serialised through an in-process queue. Single process only. Render's disk is wiped on every spin-down, so this adapter is for local runs and tests (D6) |
| `mongo` | Collections `users`, `serviceRequests` | Native driver. Unique index on `userId`; compound index on `ownerId, accessLevel, createdAt`. Paging with `skip`/`limit` and `countDocuments` (D5) |
| `dynamo` | One table, single-table design | `PK`/`SK` per item, one GSI for listing by type. See below (D7) |

**DynamoDB keys:**

| Item | PK | SK | GSI1PK | GSI1SK |
|---|---|---|---|---|
| User | `USER#<userId>` | `PROFILE` | `TYPE#USER` | `<userId>` |
| Service request | `USER#<ownerId>` | `SR#<createdAt>#<id>` | `TYPE#SR` | `<createdAt>#<id>` |

A General User's list is a `Query` on their own partition, so the ownership filter is part
of the key condition. Admin lists use the GSI. Offset paging and sorting by fields other
than `createdAt` happen in memory after the query. That is fine for demo-sized data and is
written up as a known limitation in D7 and the README.

## §7 Request flows

**Login**

```
LoginPage --POST /auth/login {userId,password,role}--> validate --> AuthService
  AuthService: findCredentials -> missing? 401
               bcrypt.compare -> false? 401
               status DISABLED? 401
               stored role != claimed role? 401        (same body for all four)
               touchLastLogin, sign JWT {sub, role} with 2h expiry
  <-- 200 {token, expiresAt, user}
AuthService (web) stores token in sessionStorage, sets currentUser signal, routes to /dashboard
```

**Any authenticated call**

```
request -> request-context -> delay -> failure -> authenticate -> require-role? -> validate
        -> controller -> service -> repository
authenticate: verify JWT -> load user by sub -> missing, DISABLED, or role changed? 401
```

Re-loading the user on every call means disabling or demoting someone takes effect on their
next request, not when their token expires (D10).

**Dashboard load**

```
DashboardPage creates three independent streams:
  ProfilePanel  <- GET /me
  SummaryPanel  <- GET /records/summary
  RecordsPanel  <- GET /records?page=1&pageSize=10&sort=createdAt&order=desc
Each stream maps to a LoadState (§18). The latency lab can switch the strategy to
all-or-nothing (forkJoin) or sequential (concat) to show the difference (§19).
```

**Admin deletes a user**

```
UsersPage -> GET /admin/users/:id (recordCount) -> confirm dialog shows the count
          -> DELETE /admin/users/:id
UserService: self? 409 SELF_ACTION. Last active admin? 409 LAST_ADMIN.
             records.deleteByOwner, then users.delete -> 204
```
