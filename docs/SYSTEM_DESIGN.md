# System design index

Section numbers are global across `docs/` and are cited from code comments, commit messages
and other docs, so they are never renumbered. New sections are appended at the end of a
file and take the next free number (currently §40). Decisions are numbered separately as
D-entries inside §27.

| § | Section | File |
|---|---|---|
| §1 | Brief | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §2 | Interpretation and scope | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §3 | Repository layout | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §4 | API layers | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §5 | Data model and seed data | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §6 | Storage adapters | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §7 | Request flows | [ARCHITECTURE.md](ARCHITECTURE.md) |
| §8 | Conventions | [API.md](API.md) |
| §9 | Simulation parameters (`delay`, `fail`, `Server-Timing`) | [API.md](API.md) |
| §10 | Health and auth endpoints | [API.md](API.md) |
| §11 | Service request endpoints | [API.md](API.md) |
| §12 | Admin user endpoints | [API.md](API.md) |
| §13 | Error codes | [API.md](API.md) |
| §14 | Structure and routing | [FRONTEND.md](FRONTEND.md) |
| §15 | Services and state | [FRONTEND.md](FRONTEND.md) |
| §16 | App initializer | [FRONTEND.md](FRONTEND.md) |
| §17 | HTTP interceptors | [FRONTEND.md](FRONTEND.md) |
| §18 | Load states | [FRONTEND.md](FRONTEND.md) |
| §19 | Latency lab | [FRONTEND.md](FRONTEND.md) |
| §20 | Admin screens | [FRONTEND.md](FRONTEND.md) |
| §21 | Design direction | [UI.md](UI.md) |
| §22 | Tokens | [UI.md](UI.md) |
| §23 | Screens | [UI.md](UI.md) |
| §24 | Components and states | [UI.md](UI.md) |
| §25 | Copy | [UI.md](UI.md) |
| §26 | Accessibility and motion | [UI.md](UI.md) |
| §27 | Decision log (D1 to D36) | [DECISIONS.md](DECISIONS.md) |
| §28 | Local setup | [WORKFLOWS.md](WORKFLOWS.md) |
| §29 | Accounts and deploy | [WORKFLOWS.md](WORKFLOWS.md) |
| §30 | Continuous integration | [WORKFLOWS.md](WORKFLOWS.md) |
| §31 | Stages and exit criteria | [WORKFLOWS.md](WORKFLOWS.md) |
| §32 | Definition of done | [WORKFLOWS.md](WORKFLOWS.md) |
| §33 | Strategy and tools | [TEST_PLAN.md](TEST_PLAN.md) |
| §34 | API tests | [TEST_PLAN.md](TEST_PLAN.md) |
| §35 | Adapter contract tests | [TEST_PLAN.md](TEST_PLAN.md) |
| §36 | Web tests | [TEST_PLAN.md](TEST_PLAN.md) |
| §37 | Guard checks | [TEST_PLAN.md](TEST_PLAN.md) |
| §38 | Manual demo script | [TEST_PLAN.md](TEST_PLAN.md) |
| §39 | Contrast record (Stage 7) | [UI.md](UI.md) |

## Reading order

- **Starting a session:** `CLAUDE.md`, then the newest file in `sessions/`.
- **Building the API:** §4, §5, §6, then §8 to §13, then §34 and §35.
- **Building the web app:** §14 to §20, then §21 to §26, then §36.
- **Before pushing a stage:** §31 for that stage's exit criteria, §37 for guard checks.
