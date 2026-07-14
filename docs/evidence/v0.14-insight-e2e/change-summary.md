# v0.14 — Insight Widget E2E Test · Change Summary

## What changed

Three end-to-end tests for the 最新周报 (Insight) widget on the dashboard. Verifies that the widget renders weekly journal content as markdown, has a "看完整周报 →" link to /weekly, and that the displayed date matches the latest weekly file in the API.

## Implementation

- `tests/e2e/real-device.mjs` — three new tests added after the existing skills test block:
  - `insight: dashboard insight widget renders latest weekly as markdown` — navigates to /?cockpit=1#/dashboard, waits for the block to render, then asserts that either `.cockpit-insight-rendered` has a markdown child (`<p>`, `<h1>`/`<h2>`/`<h3>`, `<ul>`, `<ol>`) or `.cockpit-insight-preview` has non-empty text.
  - `insight: insight block has a link to /weekly` — confirms the block contains an `<a href*="weekly">` link to the full weekly page.
  - `insight: insight date matches latest weekly file` — fetches `GET /api/weekly` to get the latest date, then verifies the block's `.cockpit-block-count` text matches.

## Verification

### Manual smoke test

All three tests pass against a live dev server with one or more weekly journals in `vault/00-Weekly/`. They form a regression suite: if the widget breaks (e.g. `renderLatestReflection` returns the empty state, the link is removed, or the date diverges from the API), at least one test catches it.

### Edge cases

- No weeklies exist → first test fails (block has no content)
- Link removed → second test fails
- API date mismatch (wrong date rendered) → third test fails

## Privacy

Tests are read-only — they only navigate to the dashboard and check DOM elements. No data is written or sent to external endpoints.

## Tradeoffs

- **Doesn't test the empty state** — when no weekly exists, the block has different structure. Could add a 4th test. Filed v0.14.x.
- **Doesn't test the "看完整周报" link click** — the link goes to /weekly but the test doesn't verify navigation. Could add. Filed v0.14.x.
- **No screenshot capture** — manual smoke uses the E2E; a screenshot at this moment would be nice. Filed v0.14.x.
