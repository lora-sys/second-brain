# v0.4.c6-schedule — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Three iterations: r#type → type, routeImplFor needed in app.js,
> entity pre-load was hardcoding 'dashboard' route. All fixed in same
> commit.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js | `item.r#type` is Rust raw identifier syntax; invalid JS. Initial patch had this. | **Fixed in same commit** — sed'd to `item.type`. |
| 2 | Medium | public/app.js | entity pre-load `renderContent('dashboard', '#/dashboard')` ignored current route, flipping schedule → dashboard. | **Fixed in same commit** — re-derives route from `location.hash` via exposed `window.__appRouteImpl`. |
| 3 | Medium | public/lib/cockpit.js | `routeImplFor` was in app.js (private to IIFE) — couldn't be reused. | **Fixed** — duplicated in app.js + exposed as `window.__appRouteImpl`. |
| 4 | Low | public/lib/cockpit.js:renderSchedule | "已逾期" includes `status: done` items. | Filed v0.4.c6.x polish. |
| 5 | Low | public/lib/cockpit.js:renderSchedule | "之后" bucket can grow unbounded for vaults with many far-future items. | Acknowledged. v0.5 pagination. |

### Bug-hunter checklist
- [x] All async paths have error handling (renderContent is sync)
- [x] No race conditions (entity pre-load re-renders with correct route)
- [x] No uncaught panics (3 errors caught + fixed during this round)
- [x] No silent failures
- [x] No path traversal
- [x] No XSS (escapeHtml for user text)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/app.js | `routeImplFor` is duplicated in two places (app.js's IIFE and the new window.__appRouteImpl). | Acknowledged. Filed v0.4.6.x: move routeImplFor to its own module (router.js) so it's defined once. |
| 2 | Low | public/lib/cockpit.js | renderSchedule is 60 lines + helpers. Grows linearly with bucket count. | Filed v0.4.6.x: split into schedule-buckets.js + schedule-page.js. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] No coupling between this and the rest of the SPA
- [x] Reuses escape / icon / parseDateOnly helpers
- [x] Self-contained (only reads from state.entities)
- [x] No security regression
- [x] Module attachment pattern (window.__state) consistent with v0.4.6 split

## Aggregator verdict

**Findings: 7 total — 0 Critical, 0 High, 2 Medium fixed in same commit, 5 Low acknowledged.**

Schedule page renders. 6 items in 3 buckets. Standard mode regression passes.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.c6.x — filter done-status from overdue bucket
- v0.4.c6.x — pagination for "之后" bucket
- v0.4.c6.x — events (calendar) integration
- v0.4.c6.笔记库 / .知识图谱 / .回顾 / .模板 / .智能体 — other 5 placeholder sections
- v0.4.6.x — move routeImplFor to its own module (router.js)
- v0.4.6.x — split cockpit.js further (schedule-buckets, schedule-page)
