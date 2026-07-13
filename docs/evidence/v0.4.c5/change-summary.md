# v0.4.c5 — Cockpit Bottom Row · Change Summary

## What changed

The Cockpit today page now has a bottom row with 3 more panels,
taking the total to 8 panels (5 main + rail + 3 bottom):
- 今日感悟 / 今日成就 / 今日关注 (v0.4.c3 main grid)
- 任务与提醒 / 即将到来 (v0.4.c4 right rail)
- 捕获的想法 / 收藏与书签 / 记忆回顾 (v0.4.c5 bottom row)

## Bottom row panels

### 捕获的想法 (Captures)
- Source: entities with `data.captured === true` OR `data.status === "inbox"`
- For v0.4.c5: empty state (no capture inbox yet — that lands in v0.5)
- Empty message: "还没有捕获的想法。试试 ⌘N（v0.5 上线）"
- Forwards-compatible: when v0.5 introduces the capture inbox, this
  panel lights up automatically

### 收藏与书签 (Bookmarks)
- Source: link entities with `data.bookmark === true`
- Each item: link to `data.url` (opens in new tab), title, host
- Empty message: "还没有收藏的链接。编辑 link 时加 `bookmark: true`"
- Use case: pin frequently-used docs / tools to the today page

### 记忆回顾 (Memory Recall)
- Source: 6 most recently updated entities across all types,
  sorted by `data.updated` desc
- Each item: type-colored dot, title, updated date
- Empty message: "还没有任何 entry"
- Use case: "what was I working on yesterday?" — at-a-glance view
  of the freshest vault activity

## Files

- `public/lib/cockpit.js`
  - Added icons: bookmark, bulb, history
  - Added helpers: `captures`, `bookmarks`, `recentActivity`,
    `renderBottomRow`
  - `renderTodayPanel` now includes `renderBottomRow(state)` at the
    end of its layout
- `public/style.css`
  - ~20 lines: `.cockpit-bottom-row`, `.cockpit-bottom-grid`
    (3-column, collapses at 1100px)

## Verification

### Cockpit mode (?cockpit=1)
- All 8 panels render
- Counts: captures 0 (empty), bookmarks 2, recent 6
- Recent items ordered by `updated` desc: respond-to-pr (today) →
  AI Engineering Harness → tauri-docs → obsidian-vault-spec →
  write-v0.4-c3 → alice
- Bookmark items: obsidian-vault-spec → help.obsidian.md,
  tauri-docs → tauri.app
- Console: 0 errors, 0 warnings

### Standard mode (regression check)
- v0.3 dashboard renders unchanged: sidebar counts, 你好 hero, 4
  stat cards, 即将到期, 最近编辑, 标签, 任务进度
- Console: 0 errors, 0 warnings

Screenshots:
- `screenshots/01-bottom-row.png` — full cockpit with bottom row
- `screenshots/02-v3-standard-regression.png` — standard v0.3 unchanged

## Decisions made

### Bookmarks = filter on existing link entities, not a new data model
- v0.4.4.x+ introduced entities. The vault already has a `type: link`.
- A `bookmark: true` frontmatter flag is enough — no new entity
  type, no new CRUD, no new Tauri command
- If a user wants more (e.g. separate bookmark collection with its
  own metadata), that's a v0.5+ feature

### Recent activity = 6 most recent, mixed types
- 6 fits the panel without scrolling
- Mixed types in one list: "what was I doing" is type-agnostic
- Sorted by `data.updated` desc: most recent first

### Captures: forward-compatible empty state
- v0.4.c5 ships the panel layout + data hook (read `data.captured`)
- The actual capture flow (keyboard shortcut, mobile share sheet,
  etc.) lands in v0.5
- The empty message tells the user to expect the feature

## What's not in this issue (filed as v0.4.c5.x or v0.5)

- v0.5 — actual capture flow (keyboard shortcut ⌘N, mobile share
  sheet, email-to-vault, etc.)
- v0.5 — bookmark collection UI (mark/unmark, organize)
- v0.5 — memory recall is a placeholder for a smarter "what should
  I re-read today?" suggestion engine
