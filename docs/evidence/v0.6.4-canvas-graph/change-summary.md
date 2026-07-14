# v0.6.4 — Canvas Force-Directed Graph · Change Summary

## What changed

The 知识图谱 (Knowledge Graph) page now has a **关系图 (Graph view)** toggle that shows the graph as an interactive force-directed canvas.

## Implementation

- `public/lib/graphforce.mjs` — `GraphForce` class
  - Fruchterman-Reingold-style simulation
  - Repulsion between all node pairs (Coulomb-like)
  - Attraction along edges (spring-like, ideal length = 80px)
  - Center pull to keep graph from drifting off
  - Velocity damping (0.85) + cap (8px/tick) to prevent explosions
  - Bounds enforcement (nodes can't leave canvas)
  - 300-iteration initial layout, then animation only on user interaction

- `public/lib/graphview.mjs` — `GraphView` class
  - Renders graph to 2D canvas with devicePixelRatio
  - Type-colored nodes: person=#ea580c / task=#0284c7 / project=#7c3aed / link=#059669
  - Node size scales with degree (more connected = bigger)
  - Hover ring + label
  - Drag to reposition (pinned while dragging)
  - Click to navigate (`location.hash = '#/entity/...'`)
  - Top-left legend (4 type colors)
  - ResizeObserver to handle container size changes

- `public/lib/cockpit.js`
  - `renderKnowledge()` — added view-toggle (列表 / 关系图 buttons)
  - `bindKnowledgeViewToggle(state)` — wires the toggle
  - `renderKnowledgeCanvas(g)` — lazy-loads graphview.mjs, instantiates GraphView

## Interaction

- **Click "关系图"** → list view hides, canvas view shows
- **Hover a node** → label appears + glow ring
- **Click a node** → navigates to that entity's detail page
- **Drag a node** → reposition it (the simulation holds it pinned)
- **Click "列表"** → canvas view tears down, list view shows

## Verification

### E2E test results

```
56 passed, 0 failed in ~38,000 ms
```

2 new tests for the canvas view (toggle exists, clicking renders canvas).

### Screenshots

- `screenshots/01-canvas-view.png` — graph in canvas mode, type-colored nodes + edges
- `screenshots/02-list-view.png` — same page in list mode (existing hubs view)

## Tradeoffs

- **No edge labels** — currently only nodes are labeled. Could add edge labels (wikilink vs #tag). Filed v0.6.4.x.
- **No node selection** — clicking a node navigates, but there's no "selected" state for staying on the page. Filed v0.6.4.x.
- **No zoom/pan** — fixed canvas size. Could add Ctrl+wheel zoom + drag-to-pan. Filed v0.6.4.x.
- **Layout is O(n²)** — fine for v0.6 vault sizes (~12-100 entities), could be slow at 1000+. Filed v0.6.4.x.
- **No force-directed clustering** — all edges have the same ideal length. Could group by entity type. Filed v0.6.4.x.
- **No minimap** — for large graphs, a minimap helps orientation. Filed v0.6.4.x.

## Privacy

- Pure client-side rendering. No data leaves the machine.
- The graph data (nodes, edges) is already computed locally in `buildGraph()`.
