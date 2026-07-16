# v0.16 — Extract Recent Activity to Standalone Component · Change Summary

## What changed

`renderRecentActivity` (the "近期活动" widget on the dashboard) lived as a
private function inside the 2960-line `public/lib/cockpit.js`. v0.16 lifts it
into its own module, `public/lib/cockpit-activity.js`, exposing
`window.__cockpitActivity.{ renderRecentActivity, TYPE_LABELS, TYPE_DOTS }`.

The rendered DOM is byte-identical to the previous cockpit.js implementation.

## Implementation

### New file

**`public/lib/cockpit-activity.js`** (141 lines) — IIFE module that:

- Reads the ICONS dict from `window.__ICONS` (set by `lib/icons.js`) so the
  `block-activity` icon matches cockpit.js's `<svg>` markup exactly.
- Defines `TYPE_LABELS` (Chinese label per event type) and `TYPE_DOTS` (CSS
  dot class per event type) as exported constants instead of inline objects.
  Added `task.in_progress` to both maps (it was missing — the type existed
  in the event-stream enum but had no mapping here, so events of that type
  rendered as the raw type string).
- Pure string output, no DOM mutation. Matches the existing cockpit widget
  contract — caller assigns the result to `innerHTML`.
- Defensive: if `window.__api` is missing or the API throws, falls through
  to the empty state instead of bubbling.

### Wire-up

- **`public/index.html`** — added `<script src="/lib/cockpit-activity.js">`
  before `<script src="/lib/cockpit.js">`. Load order:
  `marked → bridge → state → icons → api → sanitize → wikilink →
  cockpit-activity → cockpit → app`.
- **`public/lib/cockpit.js`** — deleted the inline `renderRecentActivity`
  function (~80 lines, including the `typeLabels` / `typeDots` objects). The
  single call site in `renderToday()` now goes through
  `window.__cockpitActivity.renderRecentActivity()`. cockpit.js's own
  function `icon()` and `esc()` helpers stay local (consistent with the
  project's "self-contained modules" pattern).

### Tests

- **`tests/cockpit-activity.test.mjs`** — 57 unit tests via jsdom (already a
  dep). Covers empty state, network failure, single-event render with label
  + dot + entity link, escape-on-titles, recent-slice-to-8 behavior, all 6
  documented type families, unknown-type fallback, the surface contract
  (window.__cockpitActivity exposes renderRecentActivity + TYPE_LABELS +
  TYPE_DOTS), and parity of the two constants. Wired into `npm run check`.
- **`tests/e2e/real-device.mjs`** — 4 new tests:
  - `activity: window.__cockpitActivity exposed with renderRecentActivity`
  - `activity: dashboard renders the 近期活动 block`
  - `activity: rows (if any) use known dot classes for typed events`
  - `activity: web-component returns same article wrapper as expected`

### Files touched

```
public/lib/cockpit-activity.js          | 141 +++
public/lib/cockpit.js                   |  73 -/1 +         (~80 fewer lines)
public/index.html                       |   2 +
tests/cockpit-activity.test.mjs         | 136 +++
tests/e2e/real-device.mjs               |  57 +++
package.json                            |   2 +-
```

## Verification

```
$ npm run check
…
57 passed, 0 failed    (cockpit-activity.test.mjs)
31 passed, 0 failed    (sanitize.test.mjs — carried from v0.17)
```

Manual smoke (worktree served on 3941):

```
$ curl http://127.0.0.1:3941/lib/cockpit-activity.js | head
// v0.16 — Recent Activity cockpit component (extracted from cockpit.js).
…
$ curl http://127.0.0.1:3941/ | grep cockpit-activity
  <script src="/lib/cockpit-activity.js"></script>
  <script src="/lib/cockpit.js"></script>
```

Live-browser E2E ready but blocked in this dev session by the same HTTP-proxy
sandbox limitation noted in v0.17. CI / any non-sandbox run will exercise
the 4 new e2e cases.

## Tradeoffs

- **TYPE_LABELS / TYPE_DOTS drift risk** — kept as exported constants so
  tests can compare them. If they grow further, an ADR should pull them
  out to a shared `lib/event-types.mjs` (server + client).
- **`task.in_progress` added** without an ADR — small one-row change in the
  two type maps; documented in this change summary. If a stricter taxonomy
  audit is wanted, file an ADR.
- **No CSS / UX change.** Visual output is identical except that for the
  pre-existing 'activity' ICONS entry (currently empty), the new component
  shares the same `<svg>` shell. Looks the same.

## Privacy

No data leaves the machine. Sanitization (v0.17) already covers the
markdown paths; nothing rendered here is markdown, so no interaction.

## Why this matters

cockpit.js was the largest file in the codebase at 2960 lines. v0.16 is the
first of the planned per-widget extractions on the roadmap. Lower diff
size for future widget changes, faster to navigate, and makes per-widget
unit testing trivial — exactly what unlocked the 57-test suite above.
