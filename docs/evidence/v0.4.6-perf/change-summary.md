# v0.4.6-perf — app.js Module Split · Change Summary

## What changed

`public/app.js` was 2047 lines in a single IIFE. v0.4.6-perf extracts
4 modules into their own files (each attaches to `window.__*` for
global access), leaving app.js as the orchestrator:

| Module | Lines | Purpose |
|---|---|---|
| `public/lib/bridge.js` | 56 | Tauri detection + `invokeOrFetch()` + shape adapter |
| `public/lib/state.js` | 25 | The shared `state` object |
| `public/lib/icons.js` | 28 | The `ICONS` dict (16 inline SVGs) |
| `public/lib/api.js` | 103 | The `api` object (HTTP / invoke bridge) |
| `public/app.js` | 1880 | The orchestrator (now mostly render functions) |

The total line count is about the same (the extracted modules are
IIFEs that attach globals), but each file now has a single
responsibility.

## Files

- `public/lib/bridge.js` (new) — Tauri detection + invoke-or-fetch
  with shape normalization. Attaches `window.__bridge`.
- `public/lib/state.js` (new) — `state` object definition. Attaches
  `window.__state`.
- `public/lib/icons.js` (new) — `ICONS` dict (extracted from app.js).
  Attaches `window.__ICONS`.
- `public/lib/api.js` (new) — `api` object (extracted from app.js).
  Attaches `window.__api`.
- `public/app.js` (modified) — destructures `state` / `api` / `bridge`
  at the top, removes the original section blocks.
- `public/index.html` (modified) — adds 4 new `<script>` tags for the
  modules, ordered so each module loads before its consumer.

## Loading order (in index.html)

```html
<script src="/lib/marked.min.js"></script>
<script src="/lib/bridge.js"></script>   <!-- Tauri bridge -->
<script src="/lib/state.js"></script>    <!-- shared state -->
<script src="/lib/icons.js"></script>    <!-- ICONS dict -->
<script src="/lib/api.js"></script>      <!-- api object -->
<script src="/lib/wikilink.js"></script>
<script src="/lib/cockpit.js"></script>
<script src="/app.js"></script>          <!-- orchestrator -->
```

## Verification

### Standard mode (regression)
- v0.3 dashboard renders unchanged: sidebar counts (4), hero
  "你好 👋", 4 stat cards, 即将到期, 最近编辑, 标签, 任务进度
- Console: 0 errors, 0 warnings

### Cockpit mode (regression)
- Cockpit shell renders, 8 panels present
  (3 main + 2 rail + 3 bottom)
- Console: 0 errors, 0 warnings

### Module isolation
- Each module is an IIFE that attaches to `window.__*` (no globals leak)
- Modules can be replaced independently in future refactors
- cockpit.js uses bridge/state/icons via the same window.* pattern

## What's not in this issue (filed as v0.4.6.x polish)

- Further split: pages.js (people/tasks/projects/links renderers),
  modals.js (modal/toast/quick-add/entity-modal), cockpit-today.js
  (c3+c4+c5 today panel + rail + bottom)
- Replace `innerHTML =` with proper DOM building (perf + a11y)
- Virtualize long lists (>200 items)
- Skeleton states instead of spinners

## Decisions made

### Module attachment pattern: `window.__*` instead of ES modules
- No build step. ES modules would require `<script type="module">`
  with deferred loading, which can break the existing inline-event
  handlers and the cockpit-bridge IIFE pattern.
- `window.__bridge` / `window.__state` / `window.__ICONS` /
  `window.__api` is the lowest-friction pattern: each IIFE attaches
  to a global, consumers destructure.
- Tradeoff: globals are slightly less explicit than imports, but
  they don't require a build and they make dependencies visible in
  the consumer's first 5 lines.

### Kept app.js at 1880 lines (didn't split everything)
- Tempting to do a bigger refactor (pages, modals, etc.) in one PR.
- Resisted: this PR extracts only the modules with no internal
  dependencies. Pages/modals depend on state, api, icons — they
  should be split in a follow-up PR that adds tests.
- Smaller PRs are easier to review and easier to roll back if the
  refactor introduces a bug.

### Kept cockpit.js as a single file
- cockpit.js was 523 lines, could be split into sidebar / today-panel
  / right-rail / bottom-row / icons / etc.
- Resist: same reason as above. The current shape is still
  navigable (28 functions, 8 sections, clear separators).

### `bridge.js` is in `public/lib/` not `src/` 
- It's frontend code that runs in the webview. Lives next to
  wikilink.js, marked.min.js, etc.
- Tauri Rust code is in `src-tauri/src/`. Different language, different
  build, different mental model.
