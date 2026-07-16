# Screenshots

No live-browser screenshots captured for v0.17. The dev session in which
this work ran had no reliable HTTP path from browser to local server
(network sandbox routed browser traffic through a proxy that returned
502 for `127.0.0.1`).

Verification relied on:

1. **`npm run check`** — runs `sanitize.test.mjs` (31 unit tests covering
   scripts, javascript:/vbscript:/data: URLs, on* event handlers, style=,
   iframe embed-host allowlist, markdown parity, doctype stripping,
   null/empty inputs).
2. **Module parse** — `node --check` on `server.mjs` and `lib/sanitize.mjs`;
   `new Function(code)` parse on `public/{app,lib/cockpit,lib/sanitize}.js`.
3. **Static-file smoke**:
   - `GET http://127.0.0.1:3940/lib/sanitize.js` — returns the script
     (200, full content).
   - `GET http://127.0.0.1:3940/` — page head contains
     `<script src="/lib/sanitize.js"></script>` between `wikilink.js` and
     `cockpit.js`.
4. **E2E tests** in `tests/e2e/real-device.mjs` are ready and will run in
   any non-sandbox / CI environment where the browser can talk directly
   to the local server. The same dev server (`node server.mjs` on port
   3939) that has been used for prior v0.4–v0.14 E2E suites is the target.

Live screenshots can be added by anyone running:

```sh
playwright-cli run-code --filename tests/e2e/real-device.mjs
```

The screenshots land in `docs/evidence/v0.17-sanitize-markdown/screenshots/`
via the existing `shot()` helper patched to write here.
