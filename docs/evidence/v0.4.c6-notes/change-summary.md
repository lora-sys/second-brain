# v0.4.c6.notes — Cockpit 笔记库 Section · Change Summary

## What changed

The 笔记库 (Notes) nav item (previously impl: 'soon' placeholder) is
now functional. It renders a grouped list of all entities by type.

## Layout

- 笔记库 hero: "12 个 entry，按类型分组。最近修改的排前面。"
- 4 sections (one per type), each with a colored left border:
  - 人物 (orange) — alice, bob with tags
  - 任务 (blue) — code-review, quarterly-review, respond-to-pr, team-meeting, write-v0.4-c3, buy-groceries
  - 项目 (purple) — AI Engineering Harness
  - 链接 (green) — tauri-docs, obsidian-vault-spec, random-article
- Each item: type-colored dot, title, tags (max 3), updated date
- Items within a section sorted by `data.updated` desc (most recent first)
- Click an item to navigate to its entity detail page (#/entity/<id>)

## Files

- `public/lib/cockpit.js`
  - `renderNotes(state)` — full HTML for the page
  - Updated NAV_PRIMARY entry: notes impl from 'soon' to 'notes'
  - Added `if (route === 'notes')` branch in `renderContent`
- `public/app.js`
  - Updated both `routeImplFor` and `window.__appRouteImpl` to
    return 'notes' for the notes route
- `public/style.css`
  - ~150 lines: `.cockpit-notes`, `.cockpit-notes-hero`,
    `.cockpit-notes-section` (4 type-* variants), `.cockpit-notes-item`,
    `.cockpit-tag`, `.cockpit-notes-empty`

## Verification

### Notes page (Cockpit mode)
- 4 sections render (人物, 任务, 项目, 链接)
- Section counts: 2 / 6 / 1 / 3 (matches actual entity counts)
- Items sorted by `data.updated` desc within each section
- Tags render as small pills (max 3 per item)
- Updated date shows as YYYY-MM-DD
- Console: 0 errors, 0 warnings

### Standard mode (regression)
- v0.3 dashboard renders unchanged
- Console: 0 errors, 0 warnings

Screenshots:
- `01-notes-page.png` — full notes view with all 4 sections
- `02-v3-standard-regression.png` — standard v0.3 unchanged

## Decisions made

### Reuse schedule's pattern
- Same structure: hero + sections with type-colored left borders
- Same helper functions (parseDateOnly implicit via existing, escape)
- Same approach for empty state

### Show all entities by default, no pagination
- The notes page is the "all entries" view — equivalent to the
  existing `/api/entities?type=` endpoint but for ALL types at once
- For vaults with hundreds of entries, this would scroll. Filed
  v0.4.6.x: client-side "show 50, expand to all" or virtualize.

### Tags limited to 3 per item
- Some entities have 4-5 tags. Showing all would crowd the row.
- 3 is a reasonable default; the entity detail page shows all tags.
- If you want to see all tags for an item, click it.

### Items are clickable (navigate to detail)
- The "notes" page is a navigation hub. Items link to #/entity/<id>
- The existing entity detail page handles the navigation
- No duplication of detail rendering

## What's not in this issue (filed as v0.4.c6.x)

- v0.4.c6.知识图谱 — Knowledge graph (placeholder until v0.5+)
- v0.4.c6.回顾 — Review section: 7-day recap, weekly highlights
- v0.4.c6.模板 — Templates section (placeholder until v0.5+)
- v0.4.c6.智能体 — Agent section (v0.5+)
- v0.4.c6.x polish — pagination for very large vaults
- v0.4.c6.x polish — show all tags in tooltip on hover
