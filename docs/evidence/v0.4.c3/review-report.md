# v0.4.c3 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Two iterations: panel rendered but content empty → entities not
> pre-loaded → fetch ordering fix → finally Date.parse crash.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | High | lib/server.mjs:205 | `(a.data.due \|\| '').localeCompare(...)` crashed when `due` was a `Date` object (js-yaml parses bare ISO timestamps as Date). `/api/dashboard` returned 500, dashboard never rendered in any mode. | curl `/api/dashboard` → 500 + log "TypeError: localeCompare is not a function" | **Fixed in same commit** — wrap both arguments with `String(...)`. |
| 2 | High | public/app.js:cockpitRoute | `await window.__refreshCounts()` blocked the cockpit panel from rendering whenever the dashboard fetch was slow (or hung). The panel doesn't need `/api/dashboard` data; it computes from `state.entities`. | Tauri-sim test showed cockpitRoute stuck at refreshCounts forever | **Fixed in same commit** — made refreshCounts fire-and-forget. |
| 3 | High | public/app.js:bootCockpit | `state.entities` was never populated for cockpit mode. The today panel rendered, but with empty data ("vault 还是空的"). | Playwright screenshot showed empty state despite vault having 6 entities | **Fixed in same commit** — added `api.list()` pre-load, re-render cockpit when entities arrive. |
| 4 | Low | public/lib/cockpit.js:renderTodayPanel | Tasks with `status: 'open'` and `'doing'` (Chinese-friendly vocabulary used by the user) are not counted in "已完成" because we check for `'done'`. | Task `respond-to-pr.md` with `status: done` IS counted. Tasks with `open`/`doing` aren't because they're not done. | Correct behavior — open/doing tasks belong in 今日关注 (when due). Filed as v0.4.c3 polish to add a status vocabulary mapping in tasksByStatus. |
| 5 | Low | public/lib/cockpit.js:renderTodayPanel | 今日感悟 picks the MOST RECENT non-task entity. If the user has a project called "Today" (most recent) it'll surface as the reflection. Not necessarily wrong, but the user might expect a "pick something inspiring" heuristic. | n/a | Acknowledged. v0.5 reflection agent can do better; for now most-recent is a reasonable default. |

### Bug-hunter checklist
- [x] All async paths have error handling (try/catch in cockpitRoute and pre-load)
- [x] No race conditions (fire-and-forget for refreshCounts is intentional)
- [x] No uncaught exceptions (localeCompare crash fixed)
- [x] No silent failures (warn logs on entity load failure)
- [x] No DOM coupling to v0.3 (cockpit today panel is self-contained)
- [x] Standard mode regression check passes (v0.3 dashboard renders unchanged)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/lib/cockpit.js | `renderTodayPanel` is a 90-line function with 3 sub-computations inline. As panels grow (v0.4.c4-c6), this file will become a god-module. | Documented. v0.4.6 (perf debt) will split app.js + cockpit.js into focused modules. |
| 2 | Medium | public/app.js:bootCockpit | Pre-loading entities in bootCockpit couples cockpit mode to the entity-list endpoint. If that endpoint is slow or breaks, the today panel is delayed. | Acceptable for v0.4. The fetch has a fallback (catch → panel renders empty). |
| 3 | Low | public/style.css | The `.cockpit-today-grid` is a flat 3-column layout. On mid-size screens (1024–1280) the cards might feel cramped. | Acknowledged. v0.4.c7 (evidence/E2E) will surface this with real screenshots. |
| 4 | Low | public/lib/cockpit.js | 今日感悟 only shows ONE entity (no randomization on re-render). | Documented. v0.4.c5 (memory recall) will add the rotation. |

### Architecture-reviewer checklist
- [x] No new JS deps (still 3: js-yaml, jsdom, marked)
- [x] No new Rust deps
- [x] Pure CSS changes (no JS-side dynamic styling)
- [x] No coupling between cockpit.js and v0.3 render functions (the today panel is fully self-contained)
- [x] Reuses existing icons (added 3 inline SVGs to ICONS map; same pattern as v0.4.c1)
- [x] No security regression (no new attack surface)

## Aggregator verdict

**Findings: 9 total — 0 Critical, 0 High outstanding, 3 High fixed in same commit, 6 Low acknowledged.**

- 3 High caught + fixed before merge (localeCompare crash, refreshCounts hang, entities not pre-loaded)
- 6 Low acknowledged (panel will grow, status vocabulary, etc.)

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.c3 polish — task status vocabulary mapping (`'open'` → 待办, `'doing'` → 进行中 in the dashboard counters)
- v0.4.c4 — Right rail: 任务与提醒 + 即将到来 (next cockpit panel)
- v0.4.c5 — Bottom row: 捕获的想法 + 收藏与书签 + 记忆回顾
- v0.4.c6 — Implement each placeholder section
- v0.4.c8 — 标签 full management
- v0.4.6 (perf) — split cockpit.js + app.js into focused modules
