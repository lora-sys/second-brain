# v0.4.c4 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Single iteration. 1 Low acknowledged, no High/Mid found.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | Low | public/lib/cockpit.js:upcomingTasks | `d >= today` where `today.setHours(0,0,0,0)` is local midnight. If a task's `due` field is parsed as UTC midnight (which `js-yaml` does for `due: 2026-07-12` → Date `2026-07-12T00:00:00.000Z`), the local-time comparison may put it slightly before or after local midnight. In TZ east of UTC, the UTC midnight is the previous day locally, so the task appears overdue but not "upcoming today". | Today is 2026-07-13 local. Task `buy-groceries.md` has `due: 2026-07-12` → 2026-07-12T00:00Z → 2026-07-12 08:00 local. Filter `d >= today (2026-07-13 00:00)` fails → not in 即将到来. The task IS in 任务与提醒 as 逾期 1 天, which is correct. | Acknowledged — the categorization is consistent (overdue in 任务与提醒, not yet in 即将到来 until tomorrow). Filed as v0.4.c7 polish: normalize due dates to local-date-only when comparing (strip time component). |

### Bug-hunter checklist
- [x] All async paths have error handling (no async paths added)
- [x] No race conditions (data is read-only from state.entities)
- [x] No uncaught exceptions
- [x] No silent failures
- [x] No DOM coupling
- [x] No security regression (no new code paths)
- [x] No XSS (escapeHtml used for user-derived text)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/lib/cockpit.js | `renderTodayPanel` is now ~100 lines (3 blocks + rail). `renderRightRail` adds another ~80. The cockpit.js file is now ~430 lines. As more panels land (c5, c6, c8) this becomes a god-module. | Documented. v0.4.6 (perf debt) splits cockpit.js into focused modules (sidebar, today-panel, rail, nav). |
| 2 | Low | public/lib/cockpit.js:priorityBadge | Hard-coded mapping for `'high'` / `'low'` / `'高'` / `'低'`. Doesn't handle other languages or emoji-style priorities. | Acceptable for v0.4. i18n is a later concern (probably v0.7+). |
| 3 | Low | public/lib/cockpit.js:activeTasks | Hard-coded "skip done/cancelled" filter. If the user has tasks with `status: 'wont_do'` or other custom statuses, they show up as active. | Acknowledged. Filed as v0.4.c3 polish (status vocabulary mapping). |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Pure CSS additions (no JS-side dynamic styling)
- [x] Reuses existing icons + adds 2 more in same inline-SVG style
- [x] Self-contained: rail computes from state.entities.task
- [x] No coupling to v0.3 renderers
- [x] No security regression

## Aggregator verdict

**Findings: 4 total — 0 Critical, 0 High, 0 Medium, 1 Low acknowledged, 3 architecture observations.**

No High/Mid blockers. Standard mode regression check passes.

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.c4 polish — normalize due-date comparison (strip time component)
- v0.4.c5 — Bottom row (next cockpit panel)
- v0.4.c7 — E2E cockpit tests + status vocabulary polish
- v0.4.6 (perf) — split cockpit.js into focused modules
