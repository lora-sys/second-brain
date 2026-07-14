# v0.7 — Reflection Patterns · Change Summary

## What changed

The weekly reflection now includes two new sections:
- **## 模式与趋势 (vs 上周)** — pattern detection: activity volume change, new event types, disappeared types
- **## 节奏** — average events per day

## Implementation

- `lib/weekly.mjs`
  - New `detectTrends(thisWeek, lastWeek)` — compares two summary objects, returns observations
  - `localEchoWeekly` now accepts `lastWeek` parameter and appends the pattern sections
  - `generateWeekly` fetches last week's frontmatter (`eventsCount: N`) and passes it through
  - Graceful fallback: if no last week, shows "first week" message
- `lib/server.mjs`
  - `handleWeeklyGenerate` now passes `vaultPath: cfg.vaultPath` so generateWeekly can read the previous week

## Algorithm

```js
function detectTrends(thisWeek, lastWeek) {
  if (!lastWeek || lastWeek.total === 0) return ['first week'];
  if (thisWeek.total > lastWeek.total * 1.5) → 'activity increased'
  if (thisWeek.total < lastWeek.total * 0.5) → 'activity decreased'
  for (each type):
    if (cur >= 3 && prev === 0) → 'new type appeared'
    if (cur === 0 && prev >= 3) → 'type disappeared'
}
```

## Verification

### Manual smoke test

After creating a fake "last week" journal and generating this week, the output shows:

```
## 模式与趋势 (vs 上周)
- 活动量大幅增加: 243 个事件 (上周 50)
- 新活动类型出现: task.created (23 次) — 之前没有
- ...

## 节奏
日均 34.7 个事件。
```

## Tradeoffs

- **Frontmatter-only parse** — only reads `eventsCount` from last week. Could parse the full byType breakdown. Filed v0.7.x.
- **Hard-coded thresholds** — 1.5x and 0.5x. Could be configurable. Filed v0.7.x.
- **No per-type trend magnitude** — just "appeared" / "disappeared", not "increased 50%". Filed v0.7.x.

## Privacy

Pure local computation. No new data flow. Reuses the existing frontmatter from previous weekly files.
