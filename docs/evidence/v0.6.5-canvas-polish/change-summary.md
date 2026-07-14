# v0.6.5 — Canvas Polish (Zoom/Pan/Edge Labels) · Change Summary

## What changed

The knowledge graph canvas now supports **zoom** (mouse wheel) and **pan** (click-and-drag on empty space), plus **edge highlight markers** when hovering a node.

## Interactions

- **Mouse wheel** — zoom in/out (range 0.2x to 3x). Zooms toward the cursor position, so the world point under the mouse stays under the mouse.
- **Click on empty space + drag** — pan the view. Drag a node — that node is pinned while you move it.
- **Hover an edge** — a small purple dot appears at the midpoint to highlight the connection.

## Implementation

- `public/lib/graphview.mjs`
  - Constructor: `scale = 1`, `panX = 0`, `panY = 0`, `panning = false`, `panStart = {...}`
  - `_onWheel(e)` — adjusts scale + re-pans so the world point under the cursor stays put
  - `_onMouseDown(e)` — if no node hit, start panning; track via `panning` flag
  - `_onMouseMove(e)` — when panning, update `panX`/`panY` from `clientX`/`Y` delta
  - `_onMouseUp(e)` — clear `panning` flag
  - `_getMousePos(e)` — applies inverse of pan/zoom to convert screen coords → world coords (so click/drag hit-testing still works after zooming)
  - `_render()` — wraps the draw in `ctx.save()` + `ctx.translate(panX, panY) + ctx.scale(scale, scale) + ctx.restore()`. Legend drawn outside the transform (always in screen space).
  - Edge label: small `●` at midpoint when `isHovered` is true

## Verification

### E2E test results

```
56 passed, 0 failed in ~38,000 ms
```

No new tests; the existing canvas tests confirm zoom/pan don't break the toggle.

### Manual smoke test

- Open 知识图谱 → click 关系图
- Scroll wheel over canvas → zooms in/out smoothly
- Click empty space and drag → pans the view
- Click + drag a node → node follows cursor (other nodes still under force)
- Hover over a connected pair → both nodes glow, edge turns purple, small dot appears at midpoint

### Screenshots

- `screenshots/01-canvas-with-zoom.png` — full canvas view at default zoom

## Tradeoffs

- **No pinch-to-zoom on touch devices** — only mouse wheel. Filed v0.6.5.x.
- **No fit-to-view button** — could be added to reset pan/zoom. Filed v0.6.5.x.
- **No minimap** — large graphs still hard to navigate. Filed v0.6.5.x.
- **Edge dot is the only label** — could show "wikilink" / "#tag" text. Filed v0.6.5.x.
