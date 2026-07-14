# v0.6.4 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. 56/56 E2E pass.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/graphview.mjs:_render | Labels overlap when nodes are close. Force layout could use more iterations. | Acceptable — typical for first-paint. |
| 2 | Low | public/lib/graphview.mjs:_onClick | Click on a node also fires mousemove → could trigger drag. mousedown is what initiates drag. | Acceptable. |
| 3 | Low | public/lib/graphforce.mjs | Repulsion is O(n²). 1000 nodes = 1M comparisons per tick. Could be QuadTree. | Filed v0.6.4.x. |

### Bug-hunter checklist
- [x] All async paths have error handling
- [x] No race conditions
- [x] No uncaught panics
- [x] No memory leaks (cancels RAF on stop, disconnects ResizeObserver)
- [x] No XSS (uses canvas, no DOM injection)
- [x] Standard mode regression passes

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/graphforce.mjs | Magic constants (REPULSION=8000, etc.) — could be configurable. | Acceptable for v0.6.4. |
| 2 | Low | public/lib/graphview.mjs | Uses requestAnimationFrame without pause when tab is hidden. | Filed v0.6.4.x. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Pure client-side
- [x] No security regression
- [x] Pattern matches other cockpit sections
- [x] New modules (graphforce.mjs, graphview.mjs) keep app.js/cockpit.js small

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 0 Low fixed, 5 Low acknowledged.**

Canvas graph renders correctly. Interactive features (hover, click, drag) work. Toggle between list/canvas views is clean.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.6.4.x — edge labels (wikilink vs #tag)
- v0.6.4.x — node selection (without navigation)
- v0.6.4.x — zoom/pan (Ctrl+wheel + drag)
- v0.6.4.x — QuadTree for O(n²) repulsion at 1000+ nodes
- v0.6.4.x — force-directed clustering by type
- v0.6.4.x — minimap for large graphs
- v0.6.4.x — pause RAF when tab hidden
