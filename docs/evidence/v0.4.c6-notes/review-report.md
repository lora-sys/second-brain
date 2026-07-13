# v0.4.c6.notes — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. The schedule pattern (hero + grouped sections)
> transferred directly with minimal new code. 0 errors, 0 warnings.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js | First patch missed the "笔记库" nav entry — the placeholder Python replace used escaped bytes that didn't match. Fixed with sed in second pass. | Fixed in same commit. |
| 2 | Low | public/app.js | Both `routeImplFor` (IIFE-internal) and `window.__appRouteImpl` (exposed) need the new 'notes' case. Two updates instead of one. | Acknowledged. Filed v0.4.6.x: move routeImplFor to its own module so it's defined once. |
| 3 | Low | public/lib/cockpit.js:renderNotes | Items within a section are sorted by `data.updated` desc but if `data.updated` is missing (legacy entities), they sort to the bottom (empty string). | Acceptable. Documented. |

### Bug-hunter checklist
- [x] All async paths have error handling (renderNotes is sync, renderContent wraps in try/catch)
- [x] No race conditions
- [x] No uncaught panics
- [x] No silent failures
- [x] No path traversal
- [x] No XSS (escapeHtml used for title, type, id, tag)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js | renderNotes + renderSchedule together are ~140 lines. As more sections land, this grows. | Filed v0.4.6.x: split per-section modules (schedule-page.js, notes-page.js, etc.). |
| 2 | Low | public/lib/cockpit.js | Notes uses `<a href="#/entity/...">` for navigation. This relies on the SPA's hash routing. If a future version of the SPA uses pushState, this breaks. | Acknowledged. v0.4.6.x: introduce a `navigateToEntity(id)` helper. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] No coupling to Tauri or Rust
- [x] Reuses escape / icon helpers
- [x] Self-contained (only reads from state.entities)
- [x] No security regression
- [x] Pattern matches v0.4.c6-schedule (consistency)

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 1 Low fixed, 4 Low acknowledged.**

Notes page renders. 12 items in 4 groups. Standard mode regression passes.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.c6.x — pagination for very large vaults
- v0.4.c6.x — show all tags in tooltip on hover
- v0.4.6.x — move routeImplFor to its own module (router.js)
- v0.4.6.x — split per-section modules (schedule-page.js, notes-page.js, ...)
- v0.4.c6.知识图谱 / .回顾 / .模板 / .智能体 — remaining 4 placeholder sections
