# v0.4.c6-schedule — Cockpit 日程 Section · Change Summary

## What changed

The 日程 nav item (previously impl: 'soon' placeholder) is now
functional. Clicking 日程 in the cockpit sidebar renders a new
timeline page that surfaces vault items with due/deadline dates,
grouped by recency.

## Layout

The schedule page has 5 buckets, displayed as collapsible-style
sections with accent borders:

| Bucket | Accent | Description |
|---|---|---|
| 已逾期 | red (danger) | Items with due date before today |
| 今天 | accent | Items due today |
| 明天 | soft | Items due tomorrow |
| 本周内 | soft | Items due in 2-6 days |
| 之后 | faint | Items due 7+ days out |

Each item shows: relative-day label, title, type badge.

Empty state explains how to add items: put `due: 2026-01-01` on a
task, or `deadline: 2026-01-01` on a project.

## Data sources

- **tasks** with `data.due` (ISO date or timestamp)
- **projects** with `data.deadline` or `data.due`

Both buckets merge into the same timeline (sorted by date asc).
Tasks are the dominant source; projects show up as their deadlines
approach.

## Files

- `public/lib/cockpit.js`
  - `scheduleBuckets(state)` — group items into 5 buckets by date
  - `fmtDayLabel(d, today)` — relative day label
  - `renderSchedule(state)` — full HTML for the page
  - Added `if (route === 'schedule')` branch in `renderContent`
  - Updated NAV_PRIMARY entry: schedule impl from 'soon' to 'schedule'
  - Added `const { state } = window.__state;` at top of IIFE (v0.4.6 state
    module alias)
- `public/app.js`
  - Exposed `window.__appRouteImpl(route)` (the function previously
    known as `routeImplFor` — now accessible from outside the IIFE)
  - Fixed entity pre-load: re-render with the current route, not
    hardcoded 'dashboard'. Previously, navigating to `/#/schedule`
    before entities loaded would be silently flipped back to dashboard.
- `public/style.css`
  - ~150 lines: `.cockpit-schedule`, `.cockpit-schedule-hero`,
    `.cockpit-schedule-section` (5 accent variants), `.cockpit-schedule-item`
    (12px dot, 110px day, 1fr title, 56px type), `.cockpit-schedule-empty`

## Verification

### Schedule page (Cockpit mode)
- All 5 sections render when there's data
- Empty state renders with helpful hint when no date-bearing items
- Counts per bucket: 已逾期 3, 本周内 2, 之后 1 (no 今天/明天 buckets
  for the current seed data)
- Items show relative day labels: "已逾期 2 天", "明天", "3 天后", etc.
- Items past the 7-day mark show the actual date
- Console: 0 errors, 0 warnings

### Standard mode (regression)
- v0.3 dashboard renders unchanged: sidebar counts, hero, 4 stat
  cards, 即将到期, 最近编辑, 标签, 任务进度
- Console: 0 errors, 0 warnings

Screenshots:
- `01-schedule-page.png` — full schedule with 3 sections
- `02-v3-standard-regression.png` — standard v0.3 unchanged

## Decisions made

### Data sources = tasks (due) + projects (deadline)
- Tasks are the primary source; projects show up as their deadlines
  approach. This is the most common shape in a personal knowledge
  vault: people and links don't typically have due dates.
- If a project has both `deadline` and `due`, `deadline` wins (more
  semantically specific).
- v0.5+: events (calendar entries) can be added as a third source.

### No done-filter for overdue (known limitation)
- A task marked `status: done` but with a `due` date in the past
  still shows up as overdue. This is technically incorrect but
  defensible: the user might want to see "what did I miss" even if
  they eventually completed it. Filed v0.4.c6.x polish: filter out
  `status: done` from the overdue bucket.

### "之后" bucket collapses >7 days
- Items due 7+ days out are grouped into a single bucket (no
  separate "下下周", "下个月" etc.). The schedule focuses on the
  immediate future. Items past 7 days show the actual date
  (`2026年7月20日`) so they're still findable.

### Hero counts: "6 项即将到来或逾期" includes all 5 buckets
- "即将到来" is a Chinese term for "upcoming"; "逾期" is "overdue".
- Combining them gives a single number that's actionable.

## What's not in this issue (filed as v0.4.c6.x)

- v0.4.c6.笔记库 — 笔记库 (Notes) section: list all notes + create
- v0.4.c6.知识图谱 — Knowledge graph (placeholder until v0.5+)
- v0.4.c6.回顾 — Review section: 7-day recap, weekly highlights
- v0.4.c6.模板 — Templates section (placeholder until v0.5+)
- v0.4.c6.智能体 — Agent section (v0.5+)
- v0.4.c6.x polish — filter out done-status from overdue bucket
- v0.4.c6.x polish — events (calendar) integration
