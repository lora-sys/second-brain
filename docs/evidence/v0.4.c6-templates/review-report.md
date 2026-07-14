# v0.4.c6.模板 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. Templates render, 28/28 tests pass, no regressions.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js:createFromTemplate | `window.prompt` blocks the UI. Could be smoother as a modal. | Filed v0.4.c6.x. |
| 2 | Low | public/lib/cockpit.js:TEMPLATES | Templates are in JS, not the vault. Users can't edit them from Obsidian. | Filed v0.4.c6.x. |
| 3 | Low | public/lib/cockpit.js:TEMPLATES | 12 templates is opinionated. Users might want different ones. | Acceptable for v0.4. The categories (3 per type) are a starting set. |

### Bug-hunter checklist
- [x] All async paths have error handling
- [x] No race conditions
- [x] No uncaught panics
- [x] No silent failures
- [x] No path traversal
- [x] No XSS (escapeHtml for all user text in template body)
- [x] Standard mode regression passes
- [x] Empty state handled
- [x] Click "使用模板" creates entity and navigates
- [x] Click "复制 body" copies to clipboard

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/lib/cockpit.js:TEMPLATES | The TEMPLATES dict is ~150 lines of inline JS. Worth splitting into a separate file (templates.js) when it grows past 20 entries. | Filed v0.4.c6.x. For v0.4 it's fine. |
| 2 | Low | public/style.css | ~140 lines of CSS for one section. As more sections land, the file grows. | Acceptable. Pattern matches review/notes/tags/knowledge. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Pure client-side (reads from window.__api)
- [x] Reuses existing helpers (esc, icon)
- [x] No security regression
- [x] Pattern matches schedule/notes/tags/review/knowledge (consistency)
- [x] No build step changes

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 0 Low fixed, 5 Low acknowledged.**

Templates view is functional and useful. 28/28 tests pass. Standard v3 mode regression passes.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.c6.x — vault-backed templates (one template = one markdown file in a special directory)
- v0.4.c6.x — template editor UI (add/edit/delete templates from the cockpit)
- v0.4.c6.x — dedicated "use template" modal with title + first line of body
- v0.4.c6.x — split TEMPLATES into templates.js when it grows past 20 entries
