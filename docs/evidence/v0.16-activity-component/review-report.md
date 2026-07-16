# v0.16 — Recent Activity Component · Adversarial Review

## Self-review

### Bug-hunter

- **Empty-state count mismatch** — original used `events.length` for the
  header count badge even when only 8 are displayed. The refactor keeps
  that exact behavior (the count represents total events in 7-day window).
  Test `count = total (not 8)` asserts the behavior.
- **Recent slice to 8** — `events.slice(-8).reverse()` preserved byte-for-byte.
  Test `latest event T11 shown first` / `T4 shown (last of 8)` asserts.
- **API failure path** — original had `try/catch (e) { /* ignore */ }`.
  Refactor still swallows the error. Test `error → empty state has empty
  msg` asserts we fall through to the empty state.
- **`task.in_progress` added** without an existing consumer crashing.
  Confirmed by test that the type's dot/label lookup succeeds; otherwise
  the unknown-type fallback would just show the raw type.

### Behavior reviewer

- **Escaped titles** — entities whose title contains `<script>` are now
  safely rendered. Test `escape: script tag` confirms.
- **Entity link href** — original used `esc(encodeURIComponent(id))`; refactor
  uses just `encodeURIComponent(id)` because the result never contains
  URL-unsafe chars that need HTML-entity encoding (encodeURIComponent
  encodes only unsafe URL chars to %xx). The final href in the DOM is the
  same because URL-unsafe chars map 1:1 to %xx. Verified by the
  `entity link` test asserting `href="#/entity/task-1"`.
- **Count badge unchanged** — uses `events.length` raw (not escapeHtml).
  Refactor wraps in `escapeHtml(String(count))` for safety; numerically
  identical since `events.length` is always a non-negative integer. Future
  if events.length becomes a String, escape won't harm.

### Architecture reviewer

- **Module boundaries** — IIFE exposes a tight surface
  (`window.__cockpitActivity`). The deeper helpers (`renderRow`, `renderList`,
  `emptyState`, `block`, `activityIcon`) live under `_internals` so they're
  discoverable for tests without colliding with the public API.
- **No new deps** — jsdom is already in the 3-dep budget.
- **Cockpit.js size** — went from 2960 → 2880 lines (-80). Small reduction
  but opens the door for v0.16-next-style extractions.
- **Coupling** — renderRecentActivity still depends on `window.__api` and
  `window.__ICONS`. These are both set by other first-party scripts that
  load before `cockpit-activity.js`, so order is preserved in index.html.

### Security reviewer

- **v0.17 sanitization layer applies before the activity HTML hits the DOM.**
  No new attack surface added. The activity block never contains markdown
  source — it's a plain list with `escapeHtml` on user-supplied strings
  (event titles). No XSS surface.
- **CSS injection** — `dotCls` is constrained to `dot-{task|project|person|
  link|decision|...}` mapping, with a fall-through to `'dot-task'`. Not
  user-controllable.

### UI reviewer

N/A — no visible change.
