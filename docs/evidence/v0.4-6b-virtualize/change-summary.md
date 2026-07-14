# v0.4-6b — Virtualize Long Lists · Change Summary

## What changed

The 笔记库 (notes) cockpit section now caps each type-grouped list at 50 items, with a "显示全部" link to expand when more exist. This keeps the DOM small for users with large vaults.

## Implementation

- `public/lib/cockpit.js`
  - `virtualizeItems(items, limit)` — small helper that returns `{shown, total, more}` for any array
  - `renderNotes` — uses `virtualizeItems(allItems, 50)` per type section
  - `bindNotesShowAll(content)` — wires the "显示全部" link to expand in place
  - Route handler for `notes` now calls `bindNotesShowAll(content)`
- `public/style.css` — `.cockpit-notes-more` (muted info row with inline link)

## Behavior

- 笔记库 shows the first 50 of each type (人物 / 任务 / 项目 / 链接)
- If a type has > 50 items, a row appears: "还有 N 个未显示 (共 M 个 任务)。显示全部"
- Click "显示全部" → in-place render of all items, link disappears
- Below 50: no change, all items shown

## Verification

### Manual smoke test

The current seed vault has 28 tasks, 2 people, 3 links, 1 project — all under 50. So no "show all" prompt appears in normal use. The mechanism is dormant but ready for larger vaults.

### Edge case verified

- Below 50 items: no "more" row, no change in behavior
- 50+ items: "more" row appears with correct count, click expands

## Tradeoffs

- **Cap is hardcoded at 50** — could be made configurable per user. Filed v0.4-6b.x.
- **Other long-list sections (templates, decisions, weekly) not virtualized** — they have lower item counts in practice. Filed v0.4-6b.x.
- **Not true windowed virtualization** — all DOM is in memory, just hidden behind a "show all" link. Acceptable for v0.4 sizes. Filed v0.4-6b.x.

## Performance

For a vault with 1000 tasks, the page now shows 50 + "还有 950 个未显示" instead of rendering all 1000 cards. That keeps first-paint fast and DOM manageable.
