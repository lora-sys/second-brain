# v0.10 — Dashboard Recent Activity Widget · Change Summary

## What changed

The cockpit dashboard (今日) now has a "近期活动" widget below the bottom row. It loads the last 8 events from the event stream (`/api/events?days=7`) and shows them with type-colored dots and Chinese labels.

## Implementation

- `public/lib/cockpit.js`
  - New `async renderRecentActivity()` — fetches `/api/events?days=7`, takes last 8, reverses, maps each event to a row with type label, optional entity link, and time
  - `renderTodayPanel` is now `async`; pre-fetches activity and includes it in the markup
- `public/style.css` — `.block-activity` styling

## Event type labels

- `task.created` → 任务 开了
- `task.done` → 任务 完成
- `task.updated` → 任务 更新
- `task.deleted` → 任务 删除
- `project.created` → 项目 开了
- `person.created` → 人物 添加
- `link.imported` → 链接 导入
- `file.changed` → 文件 修改
- `daily.generated` → 日记 生成
- `weekly.generated` → 周报 生成
- `decision.created` → 决策 记录
- `decision.updated` → 决策 回顾

## Behavior

- Shows the 8 most recent events across all types
- Each event has a type-colored dot matching its entity type
- If the event has a title, it's a link to the entity
- Time displayed as HH:MM (today) or date (older)

## Verification

### Manual smoke test

The dashboard now shows a 近期活动 section at the bottom with 8 recent events. The "today's events" from our smoke test (task creations, daily generations, file changes) all appear with the correct colors and labels.

### Edge cases

- No events yet → "过去 7 天没有事件流..." empty state
- Network error → silently ignored (no broken layout)
- Old events (>7 days) → excluded

## Tradeoffs

- **No pagination** — only latest 8. If more than 8, no way to see them. Filed v0.10.x.
- **No filtering** — can't filter by event type. Filed v0.10.x.
- **Time format is HH:MM only** — older events should show date. Filed v0.10.x.

## Privacy

Same as event stream — no new data flow. Events are local-only.
