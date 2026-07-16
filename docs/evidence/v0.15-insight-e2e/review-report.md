# v0.15 — Insight Widget E2E Closeout · Adversarial Review

## Self-review

### Bug-hunter

- **page.route leak on assertion failure** — wrapped in
  `try { ... } finally { unroute }` so a thrown error in the assertion
  still cleans up the stub.
- **Link click races** — uses `page.waitForTimeout(800)` after click then
  checks `page.url()`. Brittle in slow environments; could add a
  `page.waitForFunction(() => /weekly/.test(location.hash))`. Accepted as
  fine for now (matches the pattern of other tests using fixed timeouts).
- **Selector ambiguity** — `.block-insight a[href*="weekly"]` could in
  theory hit multiple anchors (empty-state link + "看完整周报 →" link)
  if both render at once. The empty-state path renders only ONE link
  (去生成 →) and the non-empty path renders only ONE link (看完整周报 →)
  — both href are `#/weekly`, but they never co-occur, so `querySelector`
  returns a deterministic one. Verified by code inspection.

### Behavior reviewer

- **Test 2 ("heading structure")** uses an OR semantics — at least one of
  `<h2>` / `<ul>` / `<p>`. If the latest weekly ever changes to a format
  that has none of these (e.g. only raw text), the test would fail loudly,
  surfacing that the markdown→HTML pipeline broke. Considered a feature.
- **Test 3 (link click)** ensures the navigation actually works end-to-end.
  A bug where the href is correct but no click handler exists would
  silently fail in real usage; this test catches that.

### Architecture reviewer

- **No app code touched.** v0.15 is a pure test/coverage change.
- **No new dependencies.**
- **Selector strategy uses class hooks** (`.block-insight`,
  `.cockpit-insight-rendered`, `.cockpit-block-body`, `.cockpit-block-title`,
  `.cockpit-block-empty`) — same vocabulary the v0.12/v0.14 tests used,
  so no new coupling was introduced.

### Security reviewer

- All assertions are read-only DOM checks. No data is fetched or sent.
  Sanitization (v0.17) layer is exercised passively since the v0.15
  tests rely on rendered HTML reaching the DOM through the same path.

### UI reviewer
N/A — no visible change.
