# v0.5.4 — Daily Timeline · Change Summary

## What changed

The cockpit 日记 page now shows a 7-day timeline at the top, making it easy to see which days have generated journals.

## Layout

Before: A single "history" list with all past journals in a flat grid.

After:
1. **Hero** (unchanged)
2. **Status cards** (unchanged)
3. **Generate action** (unchanged)
4. **Timeline grid** — 7 day cells in a row
   - Each cell shows: label (今天 / 昨天 / N 天前) + date (YYYY-MM-DD) + badge (✓ 已生成 or 无)
   - Days with journals: highlighted with accent left border + tinted badge
   - Days without journals: muted, "无" badge
   - Click any day cell to view that day's journal
5. **History list** — older journals (>6 days ago), capped at 30
6. **Viewer** (unchanged) — shows full markdown content when a day is clicked

## Why a timeline?

- A flat list is overwhelming — N items, no visual structure
- The 7-day window matches the daily journal's natural cadence (one per day, last week)
- Visual hierarchy: today/yesterday are first; "older" is collapsed below

## Implementation

- `public/lib/cockpit.js` — `renderDaily()` rewritten
  - Builds `days[]` array: today + last 6 days, each with `{date, label, journal}`
  - Renders 7-column grid with `.cockpit-daily-timeline-day` cells
  - Splits history into "in the 7-day window" (timeline) vs "older" (list)
- `public/style.css` — `.cockpit-daily-timeline*` (~60 lines)
  - 7-column grid, accent border on has-journal cells
  - Hover state, click cursor
- `tests/e2e/real-device.mjs` — 2 new tests
  - `daily: timeline has 7 day cells`
  - `daily: timeline day with journal has-journal class`

## Verification

### E2E test results

```
45 passed, 0 failed in 30,191 ms
```

### Manual verification

- Navigate to `?cockpit=1#/daily`
- See "最近 7 天" with 7 cells (今天 / 昨天 / 2-6 天前)
- Today shows "✓ 已生成" badge
- Other days show "无" badge
- Click today → opens the journal viewer
- The journal content from v0.5 generation still works end-to-end

### Screenshots

- `screenshots/01-daily-timeline.png` — full page showing the timeline + status + actions
