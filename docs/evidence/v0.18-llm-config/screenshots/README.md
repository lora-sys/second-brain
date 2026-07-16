# Screenshots

Live-browser E2E for the settings page is not captured in this dev
session (HTTP-proxy sandbox blocks browser → 127.0.0.1). Server-side
endpoints are curl-tested in `docs/evidence/v0.18-llm-config/change-summary.md`.

When the suite runs in CI / non-sandbox:

```sh
playwright-cli run-code --filename tests/e2e/real-device.mjs
```

The settings page screenshot lands in this folder.
