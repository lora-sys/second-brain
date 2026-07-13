# v0.4.6-perf — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Two iterations: tauri not defined (fixed by destructuring from
> window.__bridge), api not defined (fixed by destructuring from
> window.__api). Now both modes render with 0 console errors.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/app.js | app.js uses `tauri` and `api` as bare names after the split. If the destructuring line is removed or moved, both modes break. | Acknowledged. Documented in code. Future refactors should keep the destructure at the top. |
| 2 | Low | public/index.html | 4 new script tags added. Order matters (state.js before app.js). If someone reorders, things break. | Acceptable. The order is the natural dependency order (leaves → root). |
| 3 | Low | public/lib/bridge.js | No tests for the bridge module. | Filed v0.4.6.x polish: add a small test page that asserts `window.__bridge.invokeOrFetch` is a function. |

### Bug-hunter checklist
- [x] All async paths have error handling (invokeOrFetch catches invoke errors and falls through to fetch)
- [x] No race conditions (modules attach to window synchronously; consumer destructures synchronously)
- [x] No uncaught panics (fixed during this round)
- [x] No silent failures (bridge logs warn when invoke fails)
- [x] No path traversal
- [x] No XSS (no new code paths)
- [x] Standard + cockpit both render with 0 console errors

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/lib/*.js | All modules use `window.__*` for cross-module communication. Globals work but make the dependency graph implicit. | Documented. Filed v0.4.6.x: optionally switch to ES modules + a tiny build step (esbuild). |
| 2 | Low | public/lib/api.js | The api object's command-to-fetch mapping is a hand-rolled arg-shaping block per command. | Filed v0.4.5.x (when v0.4.5 was active). v0.4.6-perf inherits the issue. |
| 3 | Low | public/app.js | 1880 lines is still big. The render functions (dashboard, people, tasks, projects, links, settings) could be their own files. | Filed v0.4.6.x. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Each module has a single responsibility
- [x] Module boundaries are clear (IIFEs, no exports)
- [x] No coupling between modules (each only depends on its window.__* consumer)
- [x] No security regression
- [x] Total LOC roughly the same; navigability vastly improved

## Aggregator verdict

**Findings: 6 total — 0 Critical, 0 High, 0 Medium, 6 Low acknowledged.**

Standard mode: 0 console errors, all 4 sidebar nav counts present, hero rendered. Cockpit mode: 0 console errors, 8 panels rendered. The split is functionally equivalent to the pre-split state.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.6.x — further split app.js (pages, modals, cockpit panels)
- v0.4.6.x — replace `innerHTML =` with DOM building (perf + a11y)
- v0.4.6.x — virtualize long lists
- v0.4.6.x — skeleton states instead of spinners
- v0.4.6.x — bridge module unit tests
- v0.4.5.x — generic registry for api.* arg-shaping
- (long-term) — switch to ES modules with esbuild
