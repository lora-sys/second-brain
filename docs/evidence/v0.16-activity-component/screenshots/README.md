# Screenshots

No live-browser screenshots captured for v0.16 (same dev-session constraint
as v0.17 — HTTP-proxy sandbox blocks browser → 127.0.0.1).

Verification relied on:

1. **`npm run check`** — 31 (sanitize) + 57 (cockpit-activity) = 88 unit tests
   pass.
2. **Static-file smoke** — `GET /lib/cockpit-activity.js` returns the script
   on the served worktree port; `GET /` injects the script tag before
   `cockpit.js`.
3. **DOM equivalence** — unit tests verify the rendered HTML matches the
   shape produced by the pre-refactor cockpit.js code (same article wrapper,
   same class names, same title, same dot semantics, same recent-slice
   behavior, same escape rules).
4. **E2E tests** in `tests/e2e/real-device.mjs` are ready and will run in
   any non-sandbox / CI environment.
