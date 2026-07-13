# v0.4.c8 — Tags Management · Change Summary

## What changed

The 标签 (Tags) nav item in the cockpit sidebar no longer shows
"v0.4.c8 will provide complete tag management interface (merge, filter,
saved views)" placeholder. It now renders a real tag management page.

## Layout

- 标签 hero: "22 个标签，跨 26 个 entry。点击标签查看相关 entries。"
- Tag cloud: every tag with usage count, sorted by count desc, then
  alphabetically. Active tags get a purple background; hover gets a
  light purple tint.
- Below the cloud: filter results panel. Empty state ("点击上面的标签
  查看相关 entries") when nothing selected. When tags are selected, shows
  matching entities with type-colored dots + title + updated date.
- "清除筛选" button to clear all selected tags.
- Empty state: "编辑 entity 时加 `tags: [a, b, c]` 就会出现。"

## Multi-select behavior

- Click a tag → activates it (purple background)
- Click again → deactivates
- Click multiple tags → union of matching entities (an entity with
  any selected tag appears)
- "清除筛选" button → deactivates all + clears results
- Items within the results are sorted by `data.updated` desc

## Files

- `public/lib/cockpit.js`
  - Added `collectAllTags(state)` — builds `{tagName: [items]}` map
  - Added `renderTags(state)` — full HTML for the page
  - Added `bindTagClicks(content)` — wires click handlers after render
  - Replaced the placeholder tags branch in `renderContent`
- `public/style.css`
  - ~150 lines: `.cockpit-tags`, `.cockpit-tag-cloud`, `.cockpit-tag-chip`
    (with `.is-active` and hover states), `.cockpit-tag-count`,
    `.cockpit-tag-entities`, `.cockpit-tags-empty`

## Verification

### Tags page (Cockpit mode)
- 22 tags display, sorted by count desc
- Click #work → 3 entries show
- Click #dev → 2 entries (TAURI-DOCS, OBSIDIAN-VAULT-SPEC)
- Click 2 tags → 3 entries (union of matching)
- "清除筛选" button → reset
- Console: 0 errors, 0 warnings

### Standard mode (regression)
- v0.3 dashboard renders unchanged
- Console: 0 errors, 0 warnings

Screenshots:
- `01-tags-page.png` — initial tag cloud
- `02-tags-filtered.png` — 2 tags selected, 3 entries shown
- `02-v3-standard-regression.png` — standard v0.3 unchanged

## Decisions made

### Multi-select with OR semantics
- Selected tags = union of entities. An entity with any selected tag
  appears.
- Could be AND (intersection) but OR is more common in tag UIs.
- Filed v0.4.c8.x: add AND/OR toggle if users need it.

### Pure client-side (no new Tauri command)
- collectAllTags reads from window.__state.state.entities, no Rust call.
- This keeps the cockpit fast (no invoke roundtrip) and consistent
  with what the user sees in the right-rail + bottom-row.

### Show count badge on each tag
- Helps users identify high-value tags. "work" has 3, "rust" has 1.
- Filed v0.4.c8.x: clicking a tag could also show "in X entities" tooltip.

### Empty state mentions how to add tags
- "编辑 entity 时加 `tags: [a, b, c]` 就会出现"
- Directs users to the frontmatter convention used in this vault.

## What's not in this issue (filed as v0.4.c8.x)

- v0.4.c8.x — tag rename (vault_tag_rename Rust command)
- v0.4.c8.x — tag merge (vault_tag_merge: merge tag A into B across all entities)
- v0.4.c8.x — tag delete (vault_tag_delete: remove tag from all entities)
- v0.4.c8.x — AND/OR toggle for multi-select filter
- v0.4.c8.x — saved views (save current filter + view as a "preset")
- v0.4.c8.x — type filter (filter by entity type in addition to tag)
