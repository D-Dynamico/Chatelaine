# Workflows

Sections §28 to §32.

## §28 Local setup

**Prerequisites:** Node 24 or later (`.nvmrc` at the repo root says 24, and both
`package.json` files declare `"engines": { "node": ">=24" }`, so Node 26 works locally too),
npm, Git, and Docker Desktop only if you want the Mongo or DynamoDB adapters locally.

```
git clone <repo> chatelaine && cd chatelaine
cd api
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
npm ci
npm run seed                    # writes demo data to the adapter STORAGE selects
npm run dev                     # http://localhost:3000/api/health
# second terminal
cd web
npm ci
npm start                       # http://localhost:4200
```

The default `STORAGE=file` needs nothing else. To use another adapter:

```
docker compose up -d mongo      # then STORAGE=mongo, MONGO_URI=mongodb://localhost:27017
docker compose up -d dynamodb   # then STORAGE=dynamo, DYNAMO_ENDPOINT=http://localhost:8000
npm run seed                    # re-seed after switching
```

`docker-compose.yml` (written in Stage 2) runs two services: `mongo` (`mongo:7`, port 27017)
and `dynamodb` (`amazon/dynamodb-local`, port 8000, in-memory, shared DB). DynamoDB Local
accepts any credentials; `.env.example` sets dummy ones.

### npm scripts

| Script | `api/` | `web/` |
|---|---|---|
| `dev` / `start` | `tsx watch src/main.ts` | `ng serve` |
| `build` | `tsc -p tsconfig.build.json` into `dist/` | `ng build` |
| `start` (api) | `node dist/main.js` | |
| `seed` | Reset and seed the selected adapter | |
| `lint`, `format`, `format:check` | ESLint, Prettier | ESLint, Prettier |
| `typecheck` | `tsc --noEmit` | `ng build --configuration development` (plain `tsc` skips templates) and `tsc --noEmit -p tsconfig.spec.json` |
| `test` | Vitest, all suites; contract suites for mongo and dynamo skip with a printed reason when their env var is unset | `ng test` (headless, single run) |

All scripts must run unchanged on Windows and Linux (CLAUDE.md).

## §29 Accounts and deploy

Account creation and dashboard clicks are DJK's steps. Claude Code prepares the config
files and the exact values to paste.

### MongoDB Atlas (database)

1. Create a free **M0** cluster (any region near Render's, e.g. Singapore or Frankfurt).
2. Create a database user with a generated password.
3. Network access: allow `0.0.0.0/0`. Render's free instances have no fixed outbound IPs.
   The database holds only demo data; this is stated in the README.
4. Copy the connection string. Seed it from a laptop:
   `STORAGE=mongo MONGO_URI=<atlas uri> npm run seed` (use `cross-env` or set the vars in
   `.env`).

### Render (API)

`render.yaml` at the repo root declares one free web service:

| Setting | Value |
|---|---|
| Root directory | `api` |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Plan | Free |
| Env vars | `NODE_VERSION=24`, `STORAGE=mongo`, `MONGO_URI`, `MONGO_DB=chatelaine`, `JWT_SECRET` (generated), `JWT_TTL=2h`, `CORS_ORIGIN=<vercel url>`, `TRUST_PROXY=1`, `SIMULATION_ENABLED=true`, `NODE_ENV=production` |

`NODE_VERSION=24` matches `.nvmrc`. Without it, Render resolves `engines: ">=24"` to the
newest major it offers, which could differ from what was tested.

The free instance sleeps after 15 idle minutes and takes about a minute to wake. The app
shows this on boot (§16). Before a live review, open the health URL once to wake it.

### Vercel (web)

| Setting | Value |
|---|---|
| Root directory | `web` |
| Framework preset | Angular |
| Build command | `npm run build` |
| Output directory | `dist/web/browser` |

`web/vercel.json` rewrites every path to `/index.html` so deep links like `/admin/users`
survive a refresh. `environment.prod.ts` holds the Render API URL.

Netlify works the same way with a `_redirects` file; pick one and record it in the session
note.

## §30 Continuous integration

`.github/workflows/ci.yml` (Stage 7, free for public repos) runs on every push and pull
request:

- **api job:** service containers `mongo:7` and `amazon/dynamodb-local`, then `npm ci`,
  `lint`, `format:check`, `typecheck`, `test` with `MONGO_URI` and `DYNAMO_ENDPOINT` set, so
  the contract suite runs against all three adapters.
- **web job:** `npm ci`, `lint`, `format:check`, `typecheck`, `test`, `build`.

The README shows the CI badge.

## §31 Stages and exit criteria

One stage per day. A stage is pushed only when every exit criterion passes and the quality
gates (lint, format, typecheck, tests) are green in both packages touched.

| Stage | Day | Scope | Exit criteria |
|---|---|---|---|
| **0. Docs** | 1 (today) | `CLAUDE.md`, all of `docs/`, README skeleton, `.env.example` | DJK has read and approved the docs; open questions are answered or listed in the session note |
| **1. API foundation** | 1 to 2 | Scaffold `api/` (strict TS, ESM, ESLint, Prettier, Vitest); `config.ts`; logger; request context; error middleware and `AppError` types; `/health`; delay and failure middleware with `Server-Timing`; helmet, CORS, `TRUST_PROXY` and the login rate limit; repository contracts; XML file adapter (users first); password, token, auth services; `POST /auth/login`, `GET /me`; authenticate and require-role middleware; user seed | Login works for every active seed user with the right role, and `kabir` (disabled) gets the generic 401; wrong password, wrong role, unknown user and disabled user return byte-identical 401 bodies; `delay=1500` adds at least 1500 ms and `Server-Timing` shows it; `delay=abc` and `delay=10001` return 400; no response anywhere contains `passwordHash` |
| **2. Data and admin API** | 2 | Service request model and seed; `GET /records` and `/records/summary` with scope and masking; admin user CRUD with `SELF_ACTION` and `LAST_ADMIN`; Mongo adapter; DynamoDB adapter; contract suite; `docker-compose.yml` | Contract suite green on file, mongo and dynamo; every access test in §34 green; a General User's response never contains `ownerId`, `assignee` or `internalNote` keys; priority sort is by severity; seed is idempotent |
| **3. Web foundation** | 3 | `ng new web` (standalone, zoneless, SCSS, strict); pin Angular version; ESLint and Prettier; tokens, Material theme, fonts, dark mode; boot splash and initializer; `SessionStore`, `TokenStorage`, `AuthService`, `UserService`; all six interceptors; guards; shell; login page | Refresh on `/dashboard` keeps the session with no login flash; stopping the API shows the waking splash and then the retry state; a General User visiting `/admin` is redirected and the admin chunk is never requested (network tab); contrast ratios for §22 recorded; tests green |
| **4. Dashboard** | 4 | `toLoadState`; access card, summary strip, records table with server-side paging, sort, filter; role-dependent columns; expandable internal note for admins; mobile list layout | Each panel loads, empties and errors on its own (using `delay` and `fail`); General and Admin views differ exactly as §5 says; usable at 360 px; no skeleton flash on paging |
| **5. Admin** | 5 | Lazy admin route; users table with URL-backed query state; create and edit dialog with async userId check; delete dialog with record count and "Disable instead"; self-row protections | Full create, edit, disable, delete round trip on the deployed-like setup; `USER_EXISTS` and `SELF_ACTION` (forced by calling the API directly) each shown in the UI; admin chunk appears as a separate file in `ng build` output |
| **6. Latency lab** | 6 | `LatencySettingsStore`, `RequestLogStore`, lab drawer, presets, fail-next, three strategies, timeout, reload with cancellation, request timeline | Switching strategy visibly changes the timeline; double "Reload dashboard" shows cancelled bars; a 10 s delay with a 5 s timeout shows the timeout state; timeline is usable by keyboard; reduced motion respected |
| **7. Ship** | 7 | CI; Render, Atlas, Vercel deploy; README complete; accessibility pass in both themes; fresh-clone check; demo recording (DJK) | CI green; live URLs work from a cold start; a fresh clone runs locally in under 10 minutes using only the README; `req.ip` logged once on Render matches the client's real IP, confirming `TRUST_PROXY=1` before the rate limit relies on it (then the log line is removed); every item in §32 holds |

**If a day slips:** move the DynamoDB adapter from Stage 2 to the end of Stage 7 first (the
file and Mongo adapters still prove the contract), then drop the Playwright stretch goal.
The Angular stages are never cut, because they carry most of the grade.

### Substeps and commits

Each stage breaks into substeps that are one commit each (CLAUDE.md). Claude Code lists the
substeps at the start of a stage in the session note before writing code, and ticks them off
there.

## §32 Definition of done

- Every requirement in §1 is visibly met, and the README maps each one to where it lives.
- All quality gates green in both packages; CI green.
- No `any`, no `console.log`, no commented-out code, no em dashes in user-facing strings.
- Every file under about 250 lines.
- Every access rule has a test that fails if the rule is removed (§37).
- Both themes pass AA contrast; the app is usable at 360 px and by keyboard alone.
- README covers: live links, demo accounts, how to run, how to switch storage, architecture
  diagram, the async demo, design decisions (linking D-entries), testing, known limitations,
  future scope.
- The newest session note lists nothing open except DJK's submission step.
