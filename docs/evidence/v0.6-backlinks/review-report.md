# v0.6 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. 48/48 E2E pass.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/app.js:renderEntityRelations | First version of the patch had `escapeHtml(e.id)` which HTML-encoded slashes (`/` → `&#x2F;`), breaking hrefs. | Fixed — switched to `encodeURIComponent(e.id)` and added fallback to `type/slug` when `id` is missing. |
| 2 | Low | public/app.js:computeEntityRelations | Initial back-ref check used `${type}/${slug}` patterns but state.allEntities only has {type, slug, label}, not full bodies. | Fixed — added preloadAllEntitiesWithBodies() with 30s cache. |
| 3 | Low | public/app.js:renderEntityRelations | The "title" field for resolved entities is missing for some entries. Falls back to slug. | Acceptable. |

### Bug-hunter checklist
- [x] All async paths have error handling
- [x] No race conditions
- [x] No uncaught panics
- [x] No silent failures
- [x] No XSS (escapeHtml all user text)
- [x] Standard mode regression passes
- [x] Click on backlinks navigates correctly

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/app.js | `_fullEntitiesCache` is a module-level mutable state. Acceptable for SPA. | Acceptable. |
| 2 | Low | public/app.js:computeEntityRelations | The function does two scans (forward + back). Could be split for clarity. | Filed v0.6.x. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Pure client-side (no API changes)
- [x] Reuses existing helpers (escapeHtml)
- [x] Privacy-respecting
- [x] Pattern matches existing detail-page sections

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 0 Medium fixed, 1 Medium fixed, 4 Low acknowledged.**

Backlinks panel works end-to-end. Forward + back refs both functional. Click navigation works.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.6.x — 30s cache invalidation on entity write (refresh backlinks after edit)
- v0.6.x — title-based matching: handle case-insensitive + slug fallback
- v0.6.x — context preview for backlinks (show surrounding text)
- v0.6.x — Obsidian embed support `![[entity]]`
- v0.6.x — split computeEntityRelations into computeForward + computeBack
