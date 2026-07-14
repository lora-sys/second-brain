# v0.7 — Weekly Reflection · Change Summary

## What changed

The Second Brain now has a **周报 (Weekly Reflection)** generator. Scans the last 7 days of events, detects stale tasks, and produces a structured markdown summary.

## Layout

- **Hero**: 周报 title + "Local-echo 默认,接 Ollama 时切换。"
- **Status cards**: Provider / Weeklies total
- **Action**: 生成本周周报 button → writes to `00-Weekly/YYYY-MM-DD.md`
- **History**: list of past weeklies
- **Viewer**: shows full markdown content when clicked

## Sections in the weekly

1. **本周焦点** — event type breakdown (e.g. "task.created: 13, daily.generated: 24, file.changed: 22")
2. **完成的事** — count of task.done, project.done, link.imported
3. **进展中的事** — count of task.created, project.created, link.imported
4. **被忽略的信号** — heuristic: "更新 vs 完成 ratio > 2:1" flag as bottleneck
5. **陈旧任务 (open + 7+ 天未更新)** — list of stale tasks from vault
6. **下周看什么** — recommendation based on most-active type

## Implementation

- `lib/weekly.mjs`
  - `generateWeekly({date, eventsByDay, staleTasks})` — main entry, picks provider
  - `localEchoWeekly()` — deterministic fallback with all 6 sections
  - `findStaleTasksFromVault(vault, daysOld)` — scans tasks for `open + not updated in N days`
  - `writeWeekly()` / `readRecentWeeklies()` — atomic write + list, same pattern as daily
- `lib/server.mjs` — new endpoints
  - `GET /api/weekly` — list
  - `POST /api/weekly` — generate
  - `GET /api/weekly/YYYY-MM-DD` — read
- `public/lib/cockpit.js` — `renderWeekly()` + `bindWeeklyActions()`
- `public/style.css` — `.cockpit-weekly*` styles (~80 lines)
- `tests/e2e/real-device.mjs` — 4 new tests

## Verification

### E2E test results

```
64 passed, 0 failed in 54,241 ms
```

4 new tests for weekly (page renders, generate button, click → report, API list).

### Manual smoke test

```
$ curl -X POST http://127.0.0.1:3939/api/weekly -d '{}'
{
  "ok": true, "date": "2026-07-14",
  "path": "/home/lora/文档/Obsidian Vault/00-Weekly/2026-07-14.md",
  "content": "---\ndate: 2026-07-14\ntype: weekly-reflection\nperiod: 7-days\neventsCount: 62\n...",
  "provider": { "name": "local-echo", ... },
  "staleTasks": []
}
```

The daily journal "AI Engineering Harness" project shows up in the 进展中的事 list (13 task.created), and the ratio check correctly flags when updates outpace completions.

### Screenshots

- `screenshots/01-weekly-view.png` — full weekly view with all sections rendered

## Tradeoffs

- **Real LLM not wired** — the local-echo function is essentially a heuristic. When OPENAI_API_KEY is set, we'd call the LLM with a richer prompt (events + vault state + recent dailies). Filed v0.7.x.
- **Stale task detection is naive** — just "open + not updated in 7+ days". Could use machine learning on update patterns. Filed v0.7.x.
- **No multi-week comparison** — only shows this week. Could show trends (this week vs last). Filed v0.7.x.
- **No "monthly" or "yearly" aggregation** — only 7-day window. Filed v0.7.x.

## Privacy

- All computation is local. OPENAI_API_KEY enables cloud LLM (opt-in per the privacy stance).
- Stale task detection reads vault data, never writes back.
