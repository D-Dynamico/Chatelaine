# UI

Sections §21 to §26. Tokens named here are defined once in `web/src/styles/_tokens.scss`
and used everywhere else by name.

## §21 Design direction

**Subject.** Chatelaine is an internal service desk for a mid-sized company. Employees raise
service requests (a broken laptop, an access request, a network fault) and IT admins see
everything and manage accounts. The brief's real question is "who are you, and what are you
allowed to see?", so the interface is built around access.

**Concept: brass and verdigris.** Keys, locks and access cards are the physical vernacular
of access. Brass is the metal of keys; verdigris is what brass turns into with age. The two
colors are a natural pair, and they carry one meaning each:

- **Verdigris means General access.** A General User's role badge, and every request at
  `GENERAL` access level.
- **Brass means Admin access.** An admin's role badge, and every request at `ADMIN` access
  level.

**Principles**

1. **Color means access, and nothing else.** Buttons, links and focus rings use slate ink.
   Status and priority use text and shape. If something is brass or verdigris, it is
   telling you about access.
2. **The access card is the memorable element.** The dashboard opens with a full-width card
   that states who you are and, in one plain sentence, what you can and cannot see. Every
   other surface stays quiet.
3. **A role keyline.** A 4px line across the top of the shell, in the role color. A user
   always knows which hat they are wearing, and an admin demo is instantly distinguishable
   from a General User demo in screenshots.
4. **Structure through tone, not boxes.** Panels sit on a slightly lighter surface than the
   page, separated by spacing and a 1px line where needed. No grid of identical shadowed
   cards.
5. **Numbers line up.** Counts, IDs and timings use tabular figures so columns and the
   request timeline read cleanly. No monospace font for labels.

### Review against the brief

The first pass of this plan was checked for defaults that would appear on any similar
dashboard. Four changes came out of that review:

- **Primary buttons were verdigris.** Changed to slate ink, because a teal primary color
  would have competed with the access meaning of verdigris.
- **IDs and timings were monospace.** Changed to tabular figures in the body face; a mono
  font for small data labels is a template habit, not a choice for this subject.
- **The summary was four stat cards in a grid.** Changed to one horizontal strip with a
  proportional status bar, which reads faster and avoids the card kit.
- **The dashboard opened with "Good afternoon, Riya".** Replaced by the access card, which
  answers the brief's actual question.

## §22 Tokens

### Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ink` | `#1E2A33` | `#E4EAEB` | Body text, primary buttons, focus ring |
| `--ink-muted` | `#52626C` | `#9DADB3` | Secondary text, helper text |
| `--page` | `#E8EDEE` | `#151D21` | Page background |
| `--surface` | `#F8FAFA` | `#1D282D` | Panels, dialogs, table body |
| `--line` | `#C5D0D3` | `#33444B` | Decorative dividers only (input borders use `--ink-muted`, see below) |
| `--verdigris` | `#2D6B64` | `#73B8AD` | General access: text, icon, badge border |
| `--verdigris-tint` | `#D6E8E4` | `#21403C` | General access: badge fill |
| `--brass` | `#855B15` | `#DDB264` | Admin access: text, icon, badge border |
| `--brass-tint` | `#F0E1C2` | `#47391F` | Admin access: badge fill |
| `--signal` | `#A3322C` | `#EE8178` | Errors, destructive actions |
| `--signal-tint` | `#F6DEDB` | `#4A2523` | Error state backgrounds |

Every foreground and background pair above meets WCAG AA for its text size; Stage 3 checks
each pair with a contrast tool and records the ratios in the session note. Dark mode is
selected by `prefers-color-scheme`, overridable with the theme toggle, which sets
`data-theme="light|dark"` on `<html>`. The same rule must also set `color-scheme: light` or
`color-scheme: dark` there (and `light dark` for system). Material's `mat.theme` with
`theme-type: color-scheme` resolves its colors through CSS `light-dark()`, which follows
`color-scheme`, not our attribute; without it, Material components would ignore the toggle.

### Type

One family: **Public Sans** (Google Fonts, weights 400, 600, 700). It was designed for
government services, which suits an access console: plain, legible, institutional without
being cold. Fallback: `system-ui, sans-serif`. Numbers that line up use
`font-variant-numeric: tabular-nums` (Stage 3 confirms the font's tabular figures render).

Scale, ratio 1.2 from a 16px base:

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `--type-display` | 33 / 40 | 700 | Login headline, access card name |
| `--type-title` | 23 / 30 | 600 | Page titles, dialog titles |
| `--type-heading` | 19 / 26 | 600 | Panel headings |
| `--type-body` | 16 / 24 | 400 | Body text, table cells |
| `--type-small` | 13 / 18 | 400 or 600 | Helper text, badges, timeline labels |

Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows.

### Space, radius, elevation

- **Space:** 4px base. Tokens `--space-1` (4) to `--space-8` (48): 4, 8, 12, 16, 24, 32,
  40, 48.
- **Radius by hierarchy, not one value for everything:** `--radius-control` 6px (inputs,
  buttons), `--radius-panel` 10px (panels, dialogs), `--radius-tag` 999px (badges, chips).
- **Elevation:** panels have none. Only overlays (dialogs, menus, the lab drawer) cast a
  shadow, so a shadow always means "this is on top".
- **Width:** content max 1200px; reading text max 72 characters.

Angular Material is themed from these tokens through the `mat.theme` mixin and the
component override mixins. No `::ng-deep`, no overriding Material's internal class names.

**Contrast, measured at Stage 3** (ratios in the 2026-10-08 session note). Two pairs failed
the plan and were changed. Light `--brass` was `#8A5F17`, 4.36:1 on `--brass-tint`, below
AA for badge text; it is now `#855B15` (4.64:1). `--line` is about 1.5:1 against both
backgrounds, which is fine for a divider but not for an input border, a control boundary
that needs 3:1 (WCAG 1.4.11). Material's `outline` role (input borders) maps to
`--ink-muted` (6:1 or more), and `outline-variant` (dividers) maps to `--line`.

### Icons

**Material Symbols Outlined**, loaded from Google Fonts in `index.html` with `icon_names=`
listing only the icons below (alphabetical, as the API requires), and set as `<mat-icon>`'s
default font set. Adding an icon means adding its name to that list.

| Icon | Where |
|---|---|
| `lock` | Admin-level access chip |
| `radio_button_unchecked`, `pending`, `check_circle`, `archive` | Status chip: open, in progress, resolved, closed |
| `light_mode`, `dark_mode`, `contrast` | Theme toggle: light, dark, system |
| `visibility`, `visibility_off` | Show or hide password |
| `timeline`, `close` | Latency lab drawer |
| `logout` | Sign out |
| `cloud_off`, `refresh` | Server not responding, "Try again" |
| `search` | Search fields |
| `expand_more`, `expand_less` | Internal note row |
| `person_add`, `edit`, `delete`, `block`, `more_vert` | Create user, user row actions, disable |
| `check` | userId available |

## §23 Screens

### Login

```
+----------------------------------+------------------------------+
| Chatelaine                       |  Sign in                     |
|                                  |                              |
| Service requests, scoped to      |  User ID                     |
| who you are.                     |  [______________________]    |
|                                  |  Password                    |
| Try a demo account               |  [__________________] (show) |
|  [o meera.admin    Admin   ]     |                              |
|  [o riya           General ]     |  Sign in as                  |
|  [o sara           General ]     |  [ General User | Admin    ]  |
|  [o kabir          Disabled]     |                              |
|                                  |  [        Sign in         ]  |
| Server awake, responded in 140ms |                              |
+----------------------------------+------------------------------+
```

- Left half on `--page`, right half on `--surface`. Under 720px they stack, form first.
  Each half centres one capped column; the intro carries the brand mark (§40).
- **Demo accounts are key tags** (two by two, §40): a pill with a small punched-hole circle on the left,
  colored by role. Selecting one fills the user ID, password and role. Kabir's tag is muted
  and reads "Disabled" so evaluators can see the refusal on purpose.
- **Role selector** is a two-option segmented control. Each option shows one line under
  it: "See and track your own requests" and "Manage users and see every request".
- **Server line** reflects the boot health check: "Server awake, responded in 140 ms", or
  "Server not responding" with "Try again".
- Errors appear in one place above the button: "That user ID, password and role don't
  match an active account." `?reason=expired` shows "Your session ended. Sign in again."

### Shell

```
==================================================================  role keyline
 Chatelaine  Dashboard   Users                 [Timeline] [Theme] [RS]
------------------------------------------------------------------
 <router outlet>
```

- Nav shows "Users" only to admins (the route guard and the API enforce it anyway).
- The top bar is sticky and carries the role keyline, so the keyline stays in view (§40).
- "Timeline" opens the latency lab drawer and shows a small count when requests are in
  flight. A 2px progress line under the top bar shows while any request is pending.
- The avatar menu holds the user's name, role badge and "Sign out".

### Dashboard

```
+-----------------------------------------------------------------+
| Riya Sharma                                   [o General User]  |
| riya   |  Finance   |  Last signed in 2 hours ago               |
| You can see your own requests at General access. Requests that  |
| IT marks Admin are handled privately and don't appear here.     |
+-----------------------------------------------------------------+
| 18 requests   [=====open=====|===in progress===|==resolved==|c] |
| Open 5   In progress 4   Resolved 6   Closed 3     Critical 2   |
+-----------------------------------------------------------------+
| Service requests          [Search ID or title] [Status] [Prio] |
| ID       Title                       Priority  Status   Updated |
| SR-1042  Laptop battery swells...    High      In prog  2d ago  |
| ...                                                             |
|                                       1 to 10 of 18    <  >     |
+-----------------------------------------------------------------+
```

- **Access card** (the memorable element): name in `--type-display`, the role key tag,
  meta line, then the access sentence. For admins: "You can see every request, including
  Admin-level ones, internal notes and assignees." The card's left edge carries a 4px bar
  in the role color, echoing the keyline. Meta items are separated by spacing and a thin
  vertical divider, not by middle dots.
- **Summary strip:** total, then one horizontal bar split by status with labelled
  segments, then counts. Admins also get a split by access level. Each count, and
  Critical, filters the records table (§40).
- **Records table:** General Users see ID, title, category, priority, status, updated.
  Admins also see owner, access level (key tag) and assignee; the internal note opens in
  an expandable row. Priority is a mark of 1 to 4 short bars plus the word. Under 720px
  rows become stacked list items.

### Admin: users

```
 Users                                                [Create user]
 [Search name, ID or email]  [Role v]  [Status v]
 User                     Role        Status    Department  Last sign-in  ...
 Meera Nair  (You)        [o Admin]   Active    IT          just now      ...
 meera.admin
 Riya Sharma              [o General] Active    Finance     2 hours ago   ...
 riya
                                                  1 to 6 of 6   <  >
```

### Latency lab drawer

```
+--------------------------------------+
| Timeline                       Close |
| Loading strategy                     |
| (o) Independent  ( ) All at once     |
| ( ) One after another                |
| Delay   Instant Realistic Slow Stagg |
|  Profile   [----o-----]  300 ms  [ ] Fail next
|  Summary   [-------o--]  900 ms  [ ] |
|  Records   [----------o] 1600 ms [ ] |
|  Admin     [--o-------]  500 ms  [ ] |
| Timeout    [-----o----]  12 s        |
| [Reload dashboard]          Clear    |
|--------------------------------------|
| 0s      1s       2s       3s         |
| GET /me       [///|=]                |
| GET /summary  [/////////|=]          |
| GET /records  [////////////////|==]  |
+--------------------------------------+
```

Bar segments: hatched for simulated delay, solid for server work, light for network. The
timeline is the one place motion is used continuously, and only while a request is
pending.

## §24 Components and states

| Component | Notes |
|---|---|
| `role-badge` | Key tag pill: punched-hole dot, role name. Verdigris or brass |
| `access-chip` | Same shape, smaller, for a request's access level. Admin-level adds a lock icon with "Admin" text |
| `status-chip` | Neutral pill with an icon per status; text always present |
| `priority-mark` | 1 to 4 bars in `--ink`, plus the word |
| `skeleton` | Blocks shaped like the content they replace: card lines, strip, table rows |
| `empty-state` | Short sentence and one action |
| `error-state` | What failed, in the interface's voice, and "Try again" |
| `confirm-dialog` | Title states the action and target; primary button repeats the verb |

**Every async view has four states:**

| View | Loading | Empty | Error |
|---|---|---|---|
| Access card | Name and two text lines as skeleton | not possible | "Couldn't load your profile." Try again |
| Summary strip | Bar and counts as skeleton | "No requests yet." | "Couldn't load the summary." Try again |
| Records table | 5 skeleton rows | General: "You haven't raised any requests." Filtered: "No requests match these filters." Clear filters | "Couldn't load requests." Try again, with the status code in small text |
| Users table | 5 skeleton rows | "No users match these filters." Clear filters | "Couldn't load users." Try again |

A simulated failure shows the same error state as a real one, with the code
`SIMULATED_FAILURE` in the small text, so the demo exercises the real path.

## §25 Copy

Name things by what users do, keep each action's name the same through the flow, and write
errors as direction, not apology.

| Action | Button | Confirmation |
|---|---|---|
| Sign in | "Sign in" | none, the dashboard loads |
| Sign out | "Sign out" | "Signed out" snackbar on the login page |
| Create a user | "Create user" | "User created" |
| Edit a user | "Save changes" | "Changes saved" |
| Disable a user | "Disable user" | "User disabled" |
| Enable a user | "Enable user" | "User enabled" |
| Delete a user | "Delete user" | "User deleted" |
| Retry a load | "Try again" | the panel reloads |

- Errors say what happened and what to do: "That user ID is already taken. Choose another
  one." Never "Oops" or "Something went wrong" on its own.
- Roles are always "General User" and "Admin" in the UI (the API's `GENERAL` and `ADMIN`
  never appear on screen).
- No em dashes, no arrows appended to buttons, no exclamation marks.

## §26 Accessibility and motion

- **Keyboard:** every action reachable by Tab; visible focus ring (2px `--ink` outline with
  2px offset, inverted on dark). Dialogs trap focus and return it on close (Material's
  default, kept).
- **Labels:** every input has a visible label; icon-only buttons have `aria-label`.
  Badges and chips always include text, never color alone.
- **Live regions:** the boot status, form errors and snackbars are announced. Panels set
  `aria-busy` while loading.
- **Contrast:** AA for all text (§22), measured in both themes at Stage 7 (§39).
- **Width:** usable at 360px. The table becomes a list, the lab becomes a bottom sheet.
- **Motion:** skeleton to content is a 150ms crossfade, no slide-ups, no staggered
  entrances. Dialogs use Material's default transitions; the lab drawer has none. The boot
  splash mark breathes slowly while the server wakes (§40). Timeline
  bars grow only while pending. `prefers-reduced-motion: reduce` removes the crossfade and
  the bar growth: a pending bar is drawn at a fixed length labelled "Pending" and takes its
  true length when the request ends.

## §39 Contrast record (Stage 7)

Every foreground and background pair the app uses, computed from `styles/_tokens.scss` with
the WCAG relative-luminance formula (text needs 4.5:1, outlines and other graphics 3:1).
Every pair passes in both themes. The lowest text ratio is 4.64:1 (light, `--brass` on
`--brass-tint`).

The timeline's "network and browser" fill is `color-mix(in srgb, var(--ink) 50%, var(--surface))`.
At 40% it measured 2.32:1 against the panel in light mode, so it was raised to 50%, which is
3.01:1 (light) and 4.22:1 (dark) and still reads differently from the solid ink segment beside
it. The bar itself always has a 1px ink outline, so its edge is 13.98:1 (light) and 12.39:1
(dark) whatever its fill.

### Light

| Foreground | Background | Ratio | Needs | Use |
|---|---|---|---|---|
| `ink` | `page` | 12.40 | 4.5 | Body text on the page |
| `ink` | `surface` | 13.98 | 4.5 | Body text on a panel |
| `ink-muted` | `page` | 5.35 | 4.5 | Secondary text on the page |
| `ink-muted` | `surface` | 6.03 | 4.5 | Secondary text, hints and legend on a panel |
| `verdigris` | `verdigris-tint` | 4.86 | 4.5 | General role badge text |
| `verdigris` | `surface` | 5.90 | 4.5 | General accent text on a panel |
| `brass` | `brass-tint` | 4.64 | 4.5 | Admin role badge text |
| `brass` | `surface` | 5.72 | 4.5 | Admin accent text on a panel |
| `signal` | `signal-tint` | 5.37 | 4.5 | Error message text |
| `signal` | `surface` | 6.57 | 4.5 | Error outcome word on a panel |
| `surface` | `ink` | 13.98 | 4.5 | Count pill, chosen preset |
| `surface` | `signal` | 6.57 | 4.5 | Delete button label |
| `ink` | `surface` | 13.98 | 3 | Bar outline, focus ring |
| `signal` | `surface` | 6.57 | 3 | Error bar outline, timeout edge |
| `verdigris` | `surface` | 5.90 | 3 | General key tag outline |
| `brass` | `surface` | 5.72 | 3 | Admin key tag outline |
| network fill (ink 50% on surface) | `surface` | 3.01 | 3 | Segment fill; the 1px ink outline also carries the bar |

lowest text ratio: 4.64

### Dark

| Foreground | Background | Ratio | Needs | Use |
|---|---|---|---|---|
| `ink` | `page` | 14.04 | 4.5 | Body text on the page |
| `ink` | `surface` | 12.39 | 4.5 | Body text on a panel |
| `ink-muted` | `page` | 7.37 | 4.5 | Secondary text on the page |
| `ink-muted` | `surface` | 6.50 | 4.5 | Secondary text, hints and legend on a panel |
| `verdigris` | `verdigris-tint` | 4.93 | 4.5 | General role badge text |
| `verdigris` | `surface` | 6.59 | 4.5 | General accent text on a panel |
| `brass` | `brass-tint` | 5.67 | 4.5 | Admin role badge text |
| `brass` | `surface` | 7.63 | 4.5 | Admin accent text on a panel |
| `signal` | `signal-tint` | 5.09 | 4.5 | Error message text |
| `signal` | `surface` | 5.77 | 4.5 | Error outcome word on a panel |
| `surface` | `ink` | 12.39 | 4.5 | Count pill, chosen preset |
| `surface` | `signal` | 5.77 | 4.5 | Delete button label |
| `ink` | `surface` | 12.39 | 3 | Bar outline, focus ring |
| `signal` | `surface` | 5.77 | 3 | Error bar outline, timeout edge |
| `verdigris` | `surface` | 6.59 | 3 | General key tag outline |
| `brass` | `surface` | 7.63 | 3 | Admin key tag outline |
| network fill (ink 50% on surface) | `surface` | 4.22 | 3 | Segment fill; the 1px ink outline also carries the bar |

lowest text ratio: 4.93

## §40 Interface refinements after Stage 7

A pass over the finished app against the patterns of well-regarded product interfaces
(Linear, GitHub, Vercel, Stripe), keeping §21 intact: color still means access and
nothing else, structure is still tone rather than boxes, and nothing below adds a
dependency. Each change answers a problem seen in the running app, not a style preference.

**Fixes found in the running app**

- **Empty rows in the records table.** Material gives every row a fixed height, so each
  closed internal-note row still took a full row. The note row now sizes to its content.
- **Short values broke over two lines.** "SR-" over "1060", "3 weeks" over "ago". Both
  tables keep short cells on one line (only titles and names wrap), with tighter cell
  padding and a faint tint on the hovered row. The admin table now fits 1200px.
- **The sign-in page** sat against the left edge of its half, and the form half took the
  global `.panel` radius. Each half now centres a capped column.
- **The users search label was cut off.** The search box is wider.

**Interaction**

- **Summary counts filter the table** (Stripe, Linear). Each status count and Critical is
  a toggle button with `aria-pressed`: pressing it writes `?status=` or `?priority=` to the
  URL the table reads, pressing the active one clears it, and the pressed state follows the
  selects too. The summary stays presentational; the dashboard page writes the URL.
- **"/" focuses the list's search** (GitHub, Linear), through the `SearchShortcut`
  directive. It never fires in an editable field or with a modifier held. The input has
  `aria-keyshortcuts="/"` and shows a key hint, hidden on devices without hover.
- **Compact filters.** Filter fields are 40px (Material's `form-field-overrides`), not the
  56px a form uses. Forms and dialogs keep the full height.
- **Picking a demo account** marks its tag (ink ring, `aria-pressed`) until the user ID is
  edited, and moves focus to "Sign in", so one click and Enter signs in.

**Frame and identity**

- **A sticky, translucent top bar** (Vercel, Linear) that carries the role keyline, so the
  signal of which role is in use stays in view on a long table. The page blurs beneath it.
- **The active nav link is a filled pill.** The old underline plus bolder text made the
  label change width as it became active.
- **A brand mark:** a ring and one key, `BrandMark`, drawn in `currentColor`. The shell
  paints it in the role color (so it obeys principle 1); the sign-in page and the boot
  splash use ink. The same drawing is the favicon (`public/favicon.svg`), which repeats the
  `--ink` values because a favicon cannot read CSS variables.
- **The sign-in intro** has a faint ink dot grid behind it: texture without color.

**Contrast of the new pairs**, by the method of §39 (all pass; lowest text 5.35:1):

| Pair | Light | Dark |
|---|---|---|
| `ink` on the active nav pill (ink 10% over the bar) | 11.39 | 9.60 |
| `ink-muted` on the translucent bar (surface 85% over page) | 5.93 | 6.64 |
| `ink-muted` on a hovered row (ink 4% over surface) | 5.61 | 5.85 |
| `ink-muted` stat label on `page` (hovered or pressed stat) | 5.35 | 7.37 |
| `ink` pressed-stat and picked-tag ring on `surface` (3:1 needed) | 13.98 | 12.39 |
| `ink-muted` boot splash mark on `page` (3:1 needed) | 5.35 | 7.37 |
