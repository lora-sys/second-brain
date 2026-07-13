# v0.4.c3 — Cockpit Today Panel · Change Summary

## What changed

The Cockpit's default `今日` route no longer falls back to the v0.3
dashboard. Instead it renders a new "today panel" with three blocks:

- **今日感悟** — the most recently updated non-task entity (a person,
  project, or link). Becomes a "today's reflection" — something worth
  re-reading today.
- **今日成就** — tasks with `status: done` whose `updated` or
  `completed` field matches today. Count badge in the header.
- **今日关注** — tasks with `due <= today` and not done/cancelled.
  Count badge. Overdue tasks show a red dot.

## Files

- `public/lib/cockpit.js`
  - Added `todayISO`, `isSameDay`, `pickReflection`, `todayWins`,
    `todayFocus`, `renderTodayPanel`.
  - Replaced the `route === 'dashboard'` branch in `renderContent` to
    call `renderTodayPanel()` (was: call `__renderDashboard()`).
  - Added 3 new icons: `star` (感悟), `trophy` (成就), `target` (关注).

- `public/style.css`
  - Added ~140 lines of v0.4.c3 styles: `.cockpit-today` (header +
  grid), `.cockpit-today-block` (card), `.cockpit-block-*` (header /
  body / count / empty), `.cockpit-reflection-*`, `.cockpit-list*`,
  responsive collapse at 1100px.

- `public/app.js`
  - In `__bootCockpit`, pre-load entities via `api.list()` after
    `api.config.get()`. When entities arrive, re-render the cockpit
    today panel so it has real data.
  - In `cockpitRoute`, made `refreshCounts()` fire-and-forget (was
    awaited). The today panel computes its own data from
    `state.entities` and doesn't need dashboard aggregates; awaiting
    a slow `/api/dashboard` was blocking the panel from rendering
    when the dev server was unresponsive.
  - Cleaned up a stale `console.log('[app] bootCockpit START')` that
    had been left over from the debug session.

- `lib/server.mjs`
  - Fixed a latent crash: `(a.data.due || '').localeCompare(...)` and
    `(b.data.updated || '').localeCompare(...)` blew up when
    frontmatter dates were parsed by `js-yaml` as `Date` objects
    (because of the `due: 2026-07-12` style). Now uses `String(...)`
    coercion. Without this fix, `/api/dashboard` returned 500 and
    every dependent UI (including standard v0.3 mode) showed a
    spinner forever.

## Verification

- Cockpit mode (`?cockpit=1`) on a vault with 2 people + 1 project +
  3 tasks renders the today panel:
  - 今日感悟: "AI Engineering Harness" (most recent non-task entity)
  - 今日成就: 1 (respond-to-pr task with status:done, updated:today)
  - 今日关注: 2 (buy-groceries + write-v0.4-c3, both due:today)
- Standard v0.3 mode (no `?cockpit=1`) still renders the full
  v0.3 dashboard unchanged: counts in sidebar, "你好" hero, 4 stat
  cards, 即将到期 panel, 最近编辑, 标签 cloud, 任务进度.
- Browser console: 0 errors, 0 warnings on both modes.

Screenshots:
- `screenshots/01-today-panel.png` — Cockpit mode with real vault data
- `screenshots/02-v3-standard-regression.png` — Standard mode unchanged

## What's not in this issue (filed as v0.4.c*.x)

- v0.4.c4 — Right rail: 任务与提醒 + 即将到来
- v0.4.c5 — Bottom row: 捕获的想法 + 收藏与书签 + 记忆回顾
- v0.4.c6 — Implement each of the placeholder sections (笔记库 /
  知识图谱 / 日程 / 回顾 / 模板 / 智能体)
- v0.4.c8 — 标签 full management (merge / filter / saved views)
- v0.4.c3 polish — task status vocabulary mapping
  (`'open'` and `'doing'` should map to "待办" and "进行中" instead
  of always showing 0). Filed as `tasks-status-vocab`.
