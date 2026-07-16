# Screenshots

The 5 new e2e tests include `shot()` calls that write to this folder:

- `00-pre-insight.png` — cockpit dashboard just before the v0.15 block
- `01-insight-block.png` — cockpit dashboard with `.block-insight`
  visible (captured by the explicit screenshot test)
- `02-post-insight.png` — cockpit dashboard after the v0.15 block

The screenshots will appear when `tests/e2e/real-device.mjs` is run in a
browser environment that can reach `127.0.0.1:3939` directly (not through
the proxy sandbox used during this dev session). See v0.17's
`screenshots/README.md` for the same explanation.

Running the suite:

```sh
node server.mjs &        # if not already running on 3939
playwright-cli run-code --filename tests/e2e/real-device.mjs
```
