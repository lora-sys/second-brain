# v0.4.c6.知识图谱 — Cockpit Knowledge Graph · Change Summary

## What changed

The 知识图谱 (Knowledge Graph) nav item — previously a `soon` placeholder — now renders a real graph view that surfaces explicit and implicit relationships between entities.

## Connections

Two entities are connected when:

1. **Wikilink**: One entity's body contains `[[target]]` referencing the other
   (e.g. `[[Bob Wang]]`, `[[AI Engineering Harness]]`).
2. **Tag overlap**: Two entities share at least one tag
   (e.g. both tagged `work`).

Wikilinks are exact (resolve by slug or `type/slug`); tag-overlap edges
carry the shared tag as the reason label.

## Layout

- **Hero**: graph summary — total entity count, total connection count,
  count of connected nodes.
- **Type distribution**: 4 colored cards (人物 / 任务 / 项目 / 链接) with counts.
- **Top hubs**: top 5 entities by degree (most connections). Each hub
  shows its title, degree badge, and a list of related entities with
  reason labels (`wikilink` or `#tag`).
- **Empty state**: when no connections exist, prompts the user with
  `[[type/slug]]` syntax and tag-overlap as ways to grow the graph.

## Implementation

- `public/lib/cockpit.js`
  - `buildGraph(state)` — extracts wikilinks + tag overlap into edges,
    computes degree, builds adjacency lists.
  - `renderKnowledge(state)` — full HTML for the page.
  - `NAV_PRIMARY` entry `知识图谱` updated `impl: 'soon'` → `impl: 'knowledge'`.
  - New `if (route === 'knowledge')` branch in `renderContent`.
- `public/app.js`
  - `routeImplFor` + `window.__appRouteImpl` updated to map `knowledge` → `knowledge`.
- `public/style.css`
  - `.cockpit-knowledge` + `.cockpit-knowledge-hero`,
    `.cockpit-knowledge-clusters`, `.cockpit-knowledge-cluster-grid`,
    `.cockpit-knowledge-cluster`, `.cockpit-knowledge-hubs`,
    `.cockpit-knowledge-hub`, `.cockpit-knowledge-edges`,
    `.cockpit-knowledge-edge`, `.cockpit-knowledge-more`,
    `.cockpit-knowledge-empty` (~150 lines).
- `tests/e2e/real-device.mjs`
  - 5 new tests for the knowledge graph: page renders, hero counts,
    4 cluster cards, at least one hub, sidebar has no SOON badge.

## Seed data added

To make the demo meaningful, added wikilinks to 5 seed entities:
- `10-People/alice.md` — references `Bob Wang`, `AI Engineering Harness`
- `10-People/bob.md` — references `Alice Chen`, `AI Engineering Harness`
- `20-Tasks/team-meeting.md` — references the people + project + `quarterly-review`
- `20-Tasks/quarterly-review.md` — references the project + people
- `30-Projects/AI Engineering Harness.md` — references people + tasks

Result: 16 wikilink edges + several tag-overlap edges.
Graph summary: **12 entities · 12 connections · 10 connected nodes**.

## Verification

### E2E test results

```
23 passed, 0 failed in 18,009 ms
```

5 new tests for the knowledge graph (knowledge page renders; hero shows
counts; 4 cluster cards; at least 1 hub; sidebar has no SOON badge).
All previously-passing tests still pass.

### Screenshots

- `screenshots/01-knowledge-graph.png` — first viewport
- `screenshots/02-knowledge-graph-full.png` — full page (1280×1500 viewport) showing all 5 hubs
- `screenshots/03-v3-standard-regression.png` — standard v3 mode dashboard still renders

### How to verify

```
playwright-cli open
playwright-cli run-code --filename tests/e2e/real-device.mjs
playwright-cli eval "() => JSON.stringify(window.__testTally, null, 2)"
playwright-cli goto http://127.0.0.1:3939/?cockpit=1#/knowledge
```

## Tradeoffs

- **No canvas-based force-directed graph** — kept it as a text list of
  hubs + edges. A real graph would need d3-force or a hand-rolled
  simulation. Filing for v0.6.x.
- **Tag-overlap edges can be noisy** — two entities with a common tag
  like `work` connect even if they're not actually related. Real
  relations need stronger signals (semantic similarity, co-editing
  patterns). For v0.4 preview, this is acceptable.
- **No edit affordances** — this view is read-only. Future versions
  could let users confirm/reject suggested edges.
