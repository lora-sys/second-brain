# v0.6 — Backlinks Panel · Change Summary

## What changed

Every entity detail page now shows a **引用** (References) panel with two columns:
- **引用了** — entities this one references (forward)
- **被引用** — entities that reference this one (backlinks)

The panel appears at the bottom of the detail page, after the markdown body.

## How it works

```
{{entity.body}} ← extract [[targets]] → forward refs
                  ↓
              match by id, type/slug, slug, or title
                  ↓
              forward[]
                  
{{other.body}} ← scan for [[myId]] / [[mySlug]] / [[myTitle]]
                  ↓
              back[]
```

- Forward refs: parsed from `entity.body` itself.
- Backlinks: scan ALL entities' bodies for mentions of this one. Uses a 30s-cached `_fullEntitiesCache` so it's not re-fetched on every navigation.

## Layout

Each column is a list of clickable cards:
- Type-colored dot
- Entity title
- Type badge (PERSON / TASK / PROJECT / LINK)

Clicking navigates to that entity's detail page.

## Implementation

- `public/app.js`
  - `preloadAllEntitiesWithBodies()` — caches full entities (with bodies) for 30s
  - `computeEntityRelations(entity)` — returns `{forward, back}` arrays
  - `renderEntityRelations(entity)` — 2-column HTML
- `public/style.css` — `.entity-relations*` (~60 lines)
- `tests/e2e/real-device.mjs` — 2 new tests

## Verification

### Manual test

- Open AI Engineering Harness project page
- Scroll to the bottom — see "引用" panel
- 引用了 (5): Alice Chen, Bob Wang, 实现 cockpit today panel, 回复 v0.4.4 PR review, review pilot PR
- 被引用 (4): Alice Chen, Bob Wang, 季度复盘, 团队周会

### E2E test results

```
48 passed, 0 failed in ~32,000 ms
```

(2 new tests added)

### Screenshots

- `screenshots/01-alice-with-backlinks.png` — Alice's page showing 2 forward + 4 back refs
- `screenshots/02-project-with-backlinks.png` — AI Engineering Harness page showing 5 forward + 4 back refs

## Tradeoffs

- **30s cache** — backlinks may be stale for up to 30s after a change. Reload to refresh. Filed v0.6.x.
- **Title-based matching is fuzzy** — wikilinks like `[[Alice Chen]]` match by `data.title`, but if the user changes the title to "Alice" the backlink breaks. Acceptable for v0.6.
- **No context preview** — the panel shows entity names but not the surrounding text that linked to them. Could add "show in context" toggle. Filed v0.6.x.
- **No "transclusions"** — backlinks don't yet support `![[entity]]` (Obsidian embed syntax). Filed v0.6.x.

## Privacy

- Backlinks computation is client-side. No data leaves the machine.
- Only path/title/slug info shared with the renderer.
