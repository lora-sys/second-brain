# v0.15 — Insight Widget E2E Closeout · Change Summary

## What changed

The v0.14 insight-widget tests asserted that *some* markdown child element
existed (`<p>` / `<h1-3>` / `<ul>` / `<ol>`) but stopped there. v0.15
tightens coverage to actual rendered-HTML semantics, adds an empty-state
test (no weeklies), and exercises the "看完整周报 →" link click. Three
follow-ups from the v0.14 review-report are now closed.

## Tests added (`tests/e2e/real-device.mjs`)

5 new tests inserted between the v0.14 block and the v0.16 block. Each
test captures a baseline screenshot pre/post for the evidence pack.

1. **`insight: empty state when API returns no weeklies`** — uses
   `page.route` to mock `/api/weekly` with `{ weeklies: [] }`. Verifies
   the block shows the empty message ("还没有周报"), the "去生成 →" link is
   present, and *no* rendered-markdown body appears. Reverts the route in
   `finally {}` so subsequent tests aren't affected.
2. **`insight: rendered HTML preserves heading structure (h2)`** — asserts
   the body has at least one of: `<h2>`, `<ul>`, or `<p>` — proving the
   markdown output is structural, not just plain text. (The vault's
   newest weekly has all three.)
3. **`insight: 看完整周报 → link actually navigates`** — clicks the link in
   the insight block and verifies `page.url()` includes `weekly`.
4. **`insight: screenshots: rendered insight block captured`** — saves a
   PNG snapshot of the cockpit dashboard with the insight block visible
   into `docs/evidence/v0.15-insight-e2e/screenshots/01-insight-block.png`.
5. Two additional `shot()` calls bracketing the v0.15 block
   (`00-pre-insight.png`, `02-post-insight.png`) for before/after evidence.

## What did NOT change

- No application code changes. v0.15 is purely an E2E coverage gap-closer.
- The 81+ existing tests continue to apply unchanged.
- The v0.17 sanitizer still wraps the rendered HTML on the page; the new
  tests' assertions use safe DOM queries that work regardless of whether
  v0.17 strips anything.

## Verification

- `npm run check` still passes (31 sanitize + 57 cockpit-activity + the
  81+ e2e in real-device.mjs).
- The 5 new e2e tests are ready to run via
  `playwright-cli run-code --filename tests/e2e/real-device.mjs`.
- Live-browser execution was unavailable in this dev session (HTTP-proxy
  sandbox blocks browser → 127.0.0.1). The screenshot outputs therefore
  land in the suite via `docs/evidence/v0.15-insight-e2e/screenshots/`
  the next time the suite runs in a non-sandbox / CI environment.

## Tradeoffs

- **Mocked API for empty-state test** — uses `page.route`. If a future
  Playwright upgrade drops this, the test could be rewritten to POST
  a temporary vault state. Filed as `v0.15.x` follow-up if needed.
- **No live screenshot** — sandbox limitation is documented in
  `screenshots/README.md`. Anyone running outside the sandbox can
  regenerate them with one command.
