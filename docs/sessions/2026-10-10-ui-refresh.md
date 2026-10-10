# 2026-10-10: UI and UX refresh

## Scope

DJK asked for a better UI and UX, taking inspiration from well-regarded modern sites. This
came after Stage 7, so it is not a stage in §31; nothing was pushed. The recorded design
(§21) is the project's defended concept, so the brief I set myself was to **keep brass and
verdigris meaning access and nothing else**, and to borrow interaction and craft patterns
from Linear, GitHub, Vercel and Stripe rather than reskin. No dependency, API contract or
scope change, so no D-entry. Full record: `docs/UI.md` §40.

## Method

I ran the app (API already up on `STORAGE=file`, `ng serve`) and walked it in Chrome at
1440px in both themes as `meera.admin`, before changing anything. Every change below
answers something seen there.

## What changed, in commit order

1. **Records table bugs** (`6b49da5`). Closed internal-note rows left a full empty row
   under every record with a note, because Material gives each `mat-row` a fixed height and
   zeroing the cell padding did not touch it. IDs and dates wrapped ("SR-" over "1060"),
   and the admin table scrolled sideways at 1440px. A shared `rows` mixin in
   `_stacked-table.scss` (no wrap except titles and names, tighter padding, hover tint)
   serves both tables. Verified: `scrollWidth` 1152 equals `clientWidth` 1152.
2. **Summary counts filter the table** (`4d96d91`). Toggle buttons with `aria-pressed`;
   the dashboard page writes `?status=` or `?priority=CRITICAL` to the same URL query the
   records panel reads, so there is still one source of truth. Checked in the browser:
   one press sets `?status=OPEN`, the select shows "Open", the table filters.
3. **Compact filters and "/" to search** (`231de53`). 40px filter fields through
   `mat.form-field-overrides`; a `SearchShortcut` directive with three tests. Verified in
   the browser that "/" focuses the box and is not typed into it.
4. **Sticky top bar and a brand mark** (`bc55822`). The keyline moved from the shell host
   to the sticky bar so it stays in view. `BrandMark` (ring and key, `currentColor`), an
   SVG favicon with the `.ico` as fallback, and the mark on the boot splash.
5. **Sign-in page** (`1797bf0`). Centred halves, the picked demo tag marked, focus moves to
   "Sign in" after a pick. Checked at 1440px in both themes and at 502px (Chrome's narrowest
   window): no horizontal scroll.

## Surprises

- **"Open5".** Angular drops whitespace between elements, so the new stat button's text,
  and its accessible name, ran the label and count together. The existing summary test
  caught it (it expected "Open 5"); the template keeps the space with `&ngsp;`. The test
  was right and was not changed.
- **Centring that did nothing.** `justify-content: center` on the login halves had no
  effect: an `auto` grid track grows to its content's widest line. A capped track
  (`minmax(0, 28rem)`) fixed it.
- **A mutation check that proved nothing.** Deleting the focus call in `fillFrom` made the
  build fail (unused member), so the "red" run was a compile error, not the test. Re-run
  with the call replaced by a no-op: the new test failed on `document.activeElement`.
- **A browser click that missed.** A ref-based click after scrolling hit nothing, which
  first looked like the summary filter not working. A script click proved the wiring.

## Verification

- Web: lint, format check, typecheck and the production build green.
- Tests: 308, all passing when run folder by folder (core 104, shared 23, layout 13, auth
  10, dashboard 53, admin 50, latency lab 53, app 2). The single parallel run had 7
  first-test timeouts across files I did and did not touch (one in the latency lab), with
  1.4 GB free while Chrome and the dev server were running. That is the memory limit
  recorded in the Stage 6 and 7 notes, not a regression.
- New tests: the summary filter (pressed state, toggle off, Critical), `SearchShortcut`
  (fires outside fields, not inside, not with a modifier), and the picked demo tag with
  the focus move. Mutation-checked: the toggle and the focus move.
- Contrast of every new color pair, both themes, in §40. Lowest text ratio 5.35:1.

## Open items

1. **DJK: review and push.** Five commits on `main`, not pushed. CI will run the suite on
   its 16 GB runners.
2. **DJK: the visible-window walk-through** from the Stage 7 open items now also covers
   the sticky bar in dark at phone width and the "/" shortcut.
3. **Not done, worth considering:** a command palette (Ctrl+K) for navigation and actions,
   and keyboard row navigation in the tables. Both are larger than a refinement pass and
   would want their own tests and a decision.
