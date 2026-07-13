# v0.4.c6.回顾 — Cockpit Review Section · Change Summary

## What changed

The 回顾 nav item (previously impl: 'soon' placeholder) now renders
a real 7-day recap page.

## Layout

- 回顾 hero: "过去 7 天 N 次更新。按时段分组，最热门的标签："
- 热门标签 (过去 7 天): chip cloud sorted by usage count
- Daily sections: items grouped by day, labeled 今天 / 昨天 / N 天前
- Each item: type-colored dot + title + HH:MM time
- Click to navigate to entity detail

## Implementation

- `reviewBuckets(state)` — last 7 days grouped by date, items
  filtered by `data.updated` falling in the window
- `topTagsThisWeek(state)` — counts tag usage across the same window
- `renderReview(state)` — full HTML
- Reuses the same `esc` and `icon` helpers as schedule/notes
- Empty state if no activity in the last 7 days

## Files

- `public/lib/cockpit.js`
  - Added `reviewBuckets`, `topTagsThisWeek`, `renderReview`
  - Updated NAV_PRIMARY entry: review impl from 'soon' to 'review'
  - Added `if (route === 'review')` branch in `renderContent`
- `public/app.js`
  - Updated `routeImplFor` and `window.__appRouteImpl` to return
    'review' for the review route
- `public/style.css`
  - ~150 lines: `.cockpit-review`, `.cockpit-review-hero`,
    `.cockpit-review-section-block`, `.cockpit-review-tags`,
    `.cockpit-review-day`, `.cockpit-review-empty`

## Verification

### Cockpit mode (?cockpit=1#/review)
- 12 items updated in last 7 days, grouped into 4 day sections
- Top tags: work 3, second-brain 2, dev 2, designer 1, friend 1, etc.
- Console: 0 errors, 0 warnings

### Standard mode (regression)
- v0.3 dashboard renders unchanged
- Console: 0 errors, 0 warnings

Screenshots:
- `01-review-page.png` — full 回顾 page with day groups + tag cloud
- `02-v3-standard-regression.png` — standard v0.3 unchanged

## Decisions made

### "过去 7 天" hardcoded window
- Could be configurable but 7 is the common default (Apple's Review,
  GitHub's Pulse, etc.). Filed v0.4.c6.x: make it configurable.

### Items show HH:MM (not just YYYY-MM-DD)
- Same-day items need to be ordered by time, not just by date.
- Showing the time helps the user remember "what was I working on
  at 3pm yesterday".

### Day labels in Chinese
- 今天 / 昨天 / N 天前 — natural Chinese. Switched to date format
  (M月D日) for 4+ days ago where "N 天前" is awkward.

### Pure client-side (no new Tauri command)
- Reads from window.__state.state.entities. No invoke roundtrip.
- Filed v0.4.c6.x: server-side aggregation for large vaults.

## What's not in this issue (filed as v0.4.c6.x)

- v0.4.c6.x — configurable review window (default 7 days)
- v0.4.c6.x — server-side aggregation for 10k+ entities
- v0.4.c6.x — comparison with prior period (this week vs last week)
- v0.4.c6.x — task completion stats (how many tasks completed)
