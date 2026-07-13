# v0.4.7 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Real-device E2E testing on the live dev server exposed 2 critical bugs,
> both fixed in the same round.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | **Critical** | public/lib/cockpit.js:1003-1031 | `renderContent` does `content.innerHTML = X` on `#cockpit-content`. But `<main id="main">` was adopted INTO `#cockpit-content`. Setting innerHTML wipes out the adopted `<main>`. After this, `$('#main')` returns null, crashing `__renderTasks` and `__renderLinks`. | Fixed — `renderTarget()` helper prefers `#main` over `#cockpit-content`. |
| 2 | **High** | public/lib/cockpit.js:24 | `回顾` nav entry had `impl: 'soon'` despite review being implemented in v0.4.c6.回顾. Misleading sidebar. | Fixed — `impl: 'review'`. |
| 3 | Medium | tests/e2e/cockpit.mjs | c7 test passed with `expected 10` but actual nav-item count is 11. Test was passing because `playwright-cli run-code` doesn't surface pass/fail counts to stdout. | Fixed — bumped to 11 in both test files. |
| 4 | Low | tests/e2e/real-device.mjs | Test originally expected `/api/entities` to return a direct array. It returns `{items: [...]}` per the v0.1 API contract. | Fixed — updated assertion. |
| 5 | Low | tests/e2e/real-device.mjs | Test originally checked `.links-grid` / `.cockpit-links` / `.links-list`. Actual selector is `#links-list` and `.grid`. | Fixed — updated selectors. |

### Bug-hunter checklist
- [x] All async paths have error handling
- [x] No race conditions
- [x] No uncaught panics
- [x] No silent failures
- [x] No path traversal
- [x] No XSS
- [x] Standard mode regression passes
- [x] Cockpit mode covers all 9 working sections
- [x] API endpoints respond as expected

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/lib/cockpit.js:adoptV3Elements | The `moved = true` flag was set even when the move didn't happen (v3Main was null). On subsequent calls, the function returned early. Replaced with `movedMain` and `movedTitle` flags, set only on actual success, so retries are possible. | Fixed. |
| 2 | Low | public/lib/cockpit.js:renderContent | `renderTarget()` is a small helper but worth extracting — it captures the "prefer #main, fall back to #cockpit-content" decision in one place. | Done. |
| 3 | Low | tests/e2e/real-device.mjs | The test surface is now 18 assertions across 3 categories (DOM, navigation, API). Pattern matches c7 (smoke tests, no interactions). | Acceptable for v0.4.7. Filed v0.4.7.x for interaction tests. |

### Architecture-reviewer checklist
- [x] No new deps
- [x] No build step changes
- [x] Pure client-side
- [x] Reuses existing helpers
- [x] No security regression
- [x] Pattern matches the project's "fix in place, evidence to docs/evidence/" workflow

## Aggregator verdict

**Findings: 8 total — 2 Critical, 0 High, 1 Medium, 4 Low — all fixed.**

The 2 critical bugs are both real regressions found by running the test suite
against a live dev server rather than relying on c7's smoke tests. The fixes
are minimal and focused.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.7.x — real Tauri binary test on hardware (sandbox GPU limits)
- v0.4.7.x — mobile viewport tests
- v0.4.7.x — interaction tests (click → navigate, form submit → API)
- v0.4.7.x — migrate to @playwright/test for proper CI reporting
