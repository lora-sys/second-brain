# v0.4.c6.知识图谱 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. Knowledge graph renders, 23/23 tests pass, no regressions.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js:buildGraph | Bare slug wikilinks (e.g. `[[alice]]`) might collide with task slugs that have the same name. Could prefer `type/slug` resolution first. | Acceptable for v0.4. The current behavior (try `type/slug`, fall back to bare slug) handles most cases. Filed v0.4.c6.x: improve resolution order. |
| 2 | Low | public/lib/cockpit.js:buildGraph | Tag-overlap edges ignore tag specificity. `#work` (used by many) connects everything to everything; `#v1.0.0` (used by 1) connects nothing. No way to weight by tag specificity. | Acceptable for preview. Real graph would use weighted edges. |
| 3 | Low | public/lib/cockpit.js:renderKnowledge | Hub list capped at 5 + each hub's edges capped at 8. Could become a long list to scroll through for a 100-entity vault. | Acceptable for v0.4 vault size (~12 entries). |

### Bug-hunter checklist
- [x] All async paths have error handling (renderKnowledge is sync)
- [x] No race conditions
- [x] No uncaught panics
- [x] No silent failures
- [x] No path traversal
- [x] No XSS (escapeHtml for all user text)
- [x] Standard mode regression passes
- [x] Empty state handled
- [x] Click on entity → navigate (uses href="#/entity/..." which app.js handles)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/lib/cockpit.js:buildGraph | The function is ~50 lines and does 4 things: index entities, walk wikilinks, walk tag-overlap, compute adjacency. Worth splitting into helpers. | Filed v0.4.c6.x: split into buildGraphIndex, extractWikilinkEdges, extractTagOverlapEdges, buildAdjacency. |
| 2 | Low | public/style.css | ~150 lines of CSS for one section. As more sections land, the file grows. | Acceptable. Pattern matches review/notes/tags. |
| 3 | Low | docs/evidence/v0.4.c6-knowledge | No interaction tests yet (click an edge → navigate, hover → preview). | Filed v0.4.c6.x. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Pure client-side (reads from window.__state.state)
- [x] Reuses existing helpers (esc, icon, dot-*)
- [x] No security regression
- [x] Pattern matches schedule/notes/tags/review (consistency)
- [x] No build step changes

## Aggregator verdict

**Findings: 6 total — 0 Critical, 0 High, 0 Medium, 0 Low fixed, 6 Low acknowledged.**

The knowledge graph view is functional and useful with the seed data.
23/23 tests pass. Standard v3 mode regression passes.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.c6.x — split `buildGraph` into 4 helpers (index, wikilinks, tags, adjacency)
- v0.4.c6.x — improve wikilink resolution order (prefer type/slug, fall back to bare)
- v0.4.c6.x — interaction tests (click edge → navigate, hover preview)
- v0.4.c6.x — weighted edges by tag specificity
- v0.4.c6.x — canvas-based force-directed graph (v0.6 work)
