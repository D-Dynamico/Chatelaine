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
| `--line` | `#C5D0D3` | `#33444B` | Dividers, input borders |
| `--verdigris` | `#2D6B64` | `#73B8AD` | General access: text, icon, badge border |
| `--verdigris-tint` | `#D6E8E4` | `#21403C` | General access: badge fill |
| `--brass` | `#8A5F17` | `#DDB264` | Admin access: text, icon, badge border |
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
- **Demo accounts are key tags:** a pill with a small punched-hole circle on the left,
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
  segments, then counts. Admins also get a split by access level.
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
- **Contrast:** AA for all text (§22). Checked in both themes at Stage 7.
- **Width:** usable at 360px. The table becomes a list, the lab becomes a bottom sheet.
- **Motion:** skeleton to content is a 150ms crossfade, no slide-ups, no staggered
  entrances. Dialog and drawer use Material's default transitions. Timeline bars grow only
  while pending. `prefers-reduced-motion: reduce` removes the crossfade and the bar growth
  (bars jump to their final length).
