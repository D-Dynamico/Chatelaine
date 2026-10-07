# Chatelaine

Service requests, scoped to who you are. An Angular single-page app with a TypeScript API,
built as a take-home: role-based sign-in, a dashboard whose data depends on your access
level, user management for admins, and a latency lab that shows how the app handles slow
and failing requests.

> Skeleton written at Stage 0. Sections marked *(Stage N)* are completed in that stage.

## Live demo *(Stage 7)*

- App: `<vercel url>`
- API health: `<render url>/api/health`

The API runs on a free instance that sleeps after 15 idle minutes. The first visit can take
about a minute; the app shows the server waking up rather than a blank page.

### Demo accounts

All passwords are `Chatelaine@2026`. The login page lists these as one-click tags.

| User ID | Role | Shows |
|---|---|---|
| `meera.admin` | Admin | Every request, internal notes, user management |
| `vikram.admin` | Admin | A second admin to edit |
| `riya` | General User | Own requests only; some of her requests are Admin-level and hidden from her |
| `arjun` | General User | A short list |
| `sara` | General User | The empty state |
| `kabir` | General User, disabled | Sign-in is refused |

## How the brief maps to the app

| Requirement | Where |
|---|---|
| Login with user ID, password and role | Login page; `POST /api/auth/login` checks the role against the stored one |
| Dummy API with XML, MongoDB or DynamoDB storage | All three, behind one repository contract, chosen by `STORAGE` |
| Logged-in page with user details | The access card on the dashboard (`GET /api/me`) |
| Records in a table, showing access level | Service requests table; the server filters by owner and access level and removes restricted fields |
| Admin manages users | `/admin/users`: create, edit, disable, delete, with server-side protections |
| Delay parameter and async processing | `?delay=ms` on every API call; the latency lab sets it per endpoint and draws the request timeline |
| User service and app load | `UserService`/`AuthService` and an app initializer that wakes the API and restores the session |
| Modular code | Core, shared and lazy-loaded feature areas; the admin area is its own chunk |

## Running locally *(Stage 7: verified from a fresh clone)*

See [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) §28. In short:

```
cd api && cp .env.example .env && npm ci && npm run seed && npm run dev
cd web && npm ci && npm start
```

### Switching storage

```
STORAGE=file     # default, XML file, no setup
STORAGE=mongo    # docker compose up -d mongo
STORAGE=dynamo   # docker compose up -d dynamodb
```

Run `npm run seed` after switching.

## Architecture *(Stage 7: diagram)*

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The API is layered: routes,
controllers, services that hold every rule, and repositories that only talk to storage. The
web app is split into core singletons, presentational shared components, and lazy feature
areas, with signals for state and RxJS for anything over time.

## The async demo *(Stage 6)*

Open **Timeline** in the top bar. Set delays per endpoint, arm a failure, and switch the
dashboard between three loading strategies: independent, all at once, and one after
another. The timeline splits each request into simulated delay, server work and network,
using the `Server-Timing` header.

## Design decisions *(Stage 7: final pass)*

Every decision, with the alternatives considered, is in
[`docs/DECISIONS.md`](docs/DECISIONS.md). The ones most worth reading:

- Why the role at login is checked, not trusted (D11)
- Why every request re-loads the user (D10)
- Free hosting without AWS (D8)
- DynamoDB single-table design and its paging limitation (D7)
- Why the latency lab exists (D23)

## Testing *(Stage 7: counts and CI badge)*

API route tests, a repository contract suite run against all three adapters, and Angular
unit tests for services, interceptors, guards and components. See
[`docs/TEST_PLAN.md`](docs/TEST_PLAN.md).

## Known limitations

- DynamoDB listings page and sort in memory after the query; fine for demo data, not for
  large tables (D7).
- Tokens live in `sessionStorage` and cannot be revoked before they expire (D9).
- The last-admin protection narrows, but does not close, a race between two admins demoting
  each other at the same moment (D30).
- The XML file adapter is single-process and is not used in production (D6).

## Future scope

- Refresh tokens and server-side revocation; same-site cookie via a proxy rewrite
- Cursor paging for DynamoDB
- "View as General User" for admins
- Self sign-up and password reset by email
- Transactions or conditional writes for admin protections
- End-to-end tests with Playwright
- Internationalisation and server-side rendering
