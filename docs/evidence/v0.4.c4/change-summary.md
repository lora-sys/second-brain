# v0.4.c4 — Cockpit Right Rail · Change Summary

## What changed

The cockpit today panel now has a 2-column layout:
- **Main** (left): 今日感悟 / 今日成就 / 今日关注 (the v0.4.c3 blocks)
- **Rail** (right, sticky on scroll, 320px wide): 任务与提醒 + 即将到来

The rail surfaces the "stuff you need to do today/soon" without scrolling.

### Rail contents

**任务与提醒** (Tasks & Reminders)
- All tasks where `status ∉ {done, 已完成, cancelled, 已取消}`
- Sorted by due date (overdue first, then nearest)
- Up to 6 items
- Shows priority badge (高 / 低 / none) and a relative due label
  (`逾期 N 天` / `今天` / `明天` / `N 天后`)
- Red dot to signal urgency

**即将到来** (Upcoming)
- Tasks with `due ∈ [today, today+7 days]`
- Sorted by due date ascending
- Up to 6 items
- No priority badge (these are scheduled, not urgent)
- Same relative due label

## Files

- `public/lib/cockpit.js`
  - Added icons: `bell`, `calendar`
  - Added helpers: `parseDateOnly`, `activeTasks`, `upcomingTasks`,
    `priorityBadge`, `renderRightRail`
  - Wrapped the existing 3-block grid in a `<div class="cockpit-today-wrap">`
    with a 2-column grid (main + rail)

- `public/style.css`
  - Added ~30 lines: `.cockpit-today-wrap` (2-column grid with sticky
    rail), `.cockpit-rail`, `.cockpit-list-priority` (high/low
    pills), responsive collapse at 1100px (single column) and
    1280px (slightly narrower rail).

## Verification

With seed data (3 tasks: buy-groceries + write-v0.4-c3 due today,
respond-to-pr done):

COCKPIT MODE (`?cockpit=1`):
- 任务与提醒: 2 active tasks (buy-groceries + write-v0.4-c3, both
  marked 高 priority, both 逾期 1 天 because due: 2026-07-12 and
  today is 2026-07-13)
- 即将到来: 0 (the only today-due tasks are already in 任务与提醒
  because they overlap the "active" filter; a future 即将到来
  panel needs richer data — calendar entries, scheduled reminders,
  etc. — which doesn't exist yet)
- Console: 0 errors, 0 warnings

STANDARD MODE (regression check):
- v0.3 dashboard renders unchanged (sidebar counts, 你好 hero, 4
  stat cards, 即将到期, 最近编辑, 标签 cloud, 任务进度).
- Console: 0 errors, 0 warnings

Screenshots:
- `screenshots/01-today-with-rail.png` — cockpit today with rail
- `screenshots/02-v3-standard-regression.png` — standard v0.3 unchanged

## What's not in this issue (filed as v0.4.c*.x)

- v0.4.c5 — Bottom row: 捕获的想法 + 收藏与书签 + 记忆回顾
- v0.4.c6 — Implement each placeholder section (笔记库 / 知识图谱 /
  日程 / 回顾 / 模板 / 智能体)
- v0.4.c7 — E2E suite for cockpit (nav, panel switching, state)
- v0.4.c8 — 标签 full management
- v0.4.c3 polish — task status vocabulary mapping (`'open'` → 待办,
  `'doing'` → 进行中) — surfaces in 任务进度 in standard mode but
  also helps future task status filters in cockpit
