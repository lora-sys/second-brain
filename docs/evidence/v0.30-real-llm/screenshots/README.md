# Screenshots

Live-browser E2E for the cockpit agent UI is not captured in this dev
session (HTTP-proxy sandbox blocks browser → 127.0.0.1). The
`/api/agent` endpoint is curl-tested in
`change-summary.md`. The cockpit agent UI's new "↗ real LLM" or
"⚠ API 调用失败" meta line is exercised by the e2e suite on a
non-sandbox / CI run.

```sh
playwright-cli run-code --filename tests/e2e/real-device.mjs
```
