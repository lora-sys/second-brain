# v0.8 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. 72/72 E2E pass.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js:renderDecisions | Age calculation could be off by a day for users in non-UTC timezones. Acceptable for v0.8. | Acceptable. |
| 2 | Low | public/lib/cockpit.js:bindDecisionActions | The retrospective modal reuses `window.openModal` which is from app.js. If the cockpit is loaded before app.js's modal helper, this fails. | Verified — app.js loads first. |
| 3 | Low | tests/e2e/real-device.mjs | The "click weekly" test had a timing race; fixed with polling. | Fixed. |

### Bug-hunter checklist
- [x] All async paths have error handling
- [x] No race conditions (modal reuses global)
- [x] No uncaught panics
- [x] No silent failures
- [x] Standard mode regression passes

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | public/lib/cockpit.js | renderDecisions is now ~70 lines. Worth splitting helpers. | Acceptable. |
| 2 | Low | public/lib/cockpit.js:openRetrospectiveModal | Hardcoded `decisionId` argument. Could be refactored to a generic retrospective helper for any entity type. | Filed v0.8.x. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Pure client-side
- [x] No security regression
- [x] Pattern matches other cockpit sections

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 1 Low fixed, 4 Low acknowledged.**

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.8.x — automatic retrospective reminder (weekly prompt for 30+ day pending)
- v0.8.x — show outcome icon in card list (✓ / ~ / ✗)
- v0.8.x — custom decision-detail page in cockpit
- v0.8.x — link decisions to tasks (linkedTasks array)
- v0.8.x — generic retrospective helper (not just decisions)
