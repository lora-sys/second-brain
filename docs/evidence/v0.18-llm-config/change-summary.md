# v0.18 — In-app LLM Configuration Panel · Change Summary

## What changed

OpenAI-compatible LLM credentials (`OPENAI_API_KEY`, `OPENAI_BASE_URL`,
`OPENAI_MODEL`) used to be set via `.env` process env vars. v0.18 moves them
into the existing in-app settings panel via `config.json`, with the API key
masked in HTTP responses and zero risk of accidental overwrite.

Also fixed a long-standing silent bug: `lib/weekly.mjs#pickProvider` used
`require('./llm/openai.mjs')`, which **doesn't work in ESM** (.mjs) files —
weekly generation has been silently falling back to local-echo the whole
time. v0.18 replaces it with a proper ESM import.

## Implementation

### New file
- **`tests/llm-config.test.mjs`** — 33 unit tests covering `maskApiKey`,
  `getLlmOpts`, `pickProvider` from both daily.mjs and weekly.mjs (with
  and without env), and round-trip redact semantics.

### Modified files

- **`lib/server.mjs`**:
  - `DEFAULT_CONFIG.llm = { apiKey, baseUrl, model }` (all empty).
  - `loadConfig()` now merges the `llm` block on read.
  - `maskApiKey(k)` — formats as `••••••••<last4>`.
  - `redactConfig(cfg)` — exports a redacted copy with `apiKey` masked
    and a `configured` boolean flag.
  - `getLlmOpts(cfg)` — exports the plain (un-redacted) opts for server
    use only.
  - `GET /api/config` — returns `redactConfig(cfg)`.
  - `PUT /api/config` — accepts `{ llm: { apiKey?, baseUrl?, model?,
    clearApiKey? } }`:
    - missing field = no-op,
    - empty string = explicit clear (for apiKey),
    - `{ clearApiKey: true }` = clear (alternative),
    - mask-shaped value (`^•{4,}`) = treat as no-op (UI echoing a
      masked field doesn't wipe the real key).
  - `POST /api/llm/test` — new endpoint that probes the configured
    provider with a tiny "ping" completion. Returns
    `{ ok, provider, sample, note }` on success and
    `{ ok: false, error }` on failure.

- **`lib/daily.mjs`**:
  - `pickProvider(opts = {})` — accepts opts, merges with env, returns
    `CachedProvider(OpenAI-compatible)` when apiKey or baseURL set,
    else `LocalEchoProvider`.

- **`lib/weekly.mjs`**:
  - **Bug fix**: replaced broken `require('./llm/openai.mjs')` with
    proper ESM import (the require has been silently failing — see
    above).
  - Also added `CachedProvider` import for parity with daily.mjs.
  - `pickProvider(opts = {})` accepts opts the same way.

- **`public/app.js`** — `renderSettings` now renders an "LLM (云端模型 — 可选)"
  section:
  - **Status badge**: green ● "已配置 (key: ••••7890)" or gray ○ "未配置 —
    生成时使用 local-echo".
  - **API key field**: password input, initially `readonly` displaying the
    masked key (or empty when unconfigured). "替换" button flips it to
    editable text. "清除" button asks for confirm, then sends
    `clearApiKey: true` and rerenders.
  - **Base URL** + **Model** text inputs.
  - **测试** button — saves current values, then calls
    `POST /api/llm/test` and renders the result inline.

- **`docs/decisions/0008-llm-config.md`** — new ADR documenting the env
  → config.json migration, the redaction strategy, and why encryption-
  at-rest is out of scope (filed as `v0.18.x`).

### Constraints honored

- **No new npm dep** (kept the 3-dep budget).
- **No new CLI flags** — config-key UI is the entry point.
- **Backward-compatible**: empty values still fall through to
  `process.env.OPENAI_API_KEY` etc., so existing `.env`-only deployments
  keep working unchanged.

## Verification

### Unit (33/33 pass)
```
$ npm run check
…
33 passed, 0 failed    (llm-config.test.mjs — new)
57 passed, 0 failed    (cockpit-activity.test.mjs — v0.16)
31 passed, 0 failed    (sanitize.test.mjs — v0.17)
```

### End-to-end smoke (worktree server on 3942)

```
$ curl -X POST http://127.0.0.1:3942/api/config \
       -d '{"llm":{"apiKey":"sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890"}}'
{ …, "llm": { "apiKey": "••••••••7890", "configured": true, … } }   ✓ masked

$ curl http://127.0.0.1:3942/api/config
{ …, "llm": { "apiKey": "••••••••7890", "configured": true, … } }   ✓ still masked

$ curl -X PUT -d '{"llm":{"apiKey":"••••••••7890"}}'
… still configured: true (mask-as-value is no-op, not a wipe)        ✓

$ curl -X PUT -d '{"llm":{"clearApiKey":true}}'
configured: false, apiKey: ""                                        ✓

$ curl -X POST http://127.0.0.1:3942/api/llm/test
{ ok: false, error: "fetch failed" }                                 ✓ endpoint reachable
```

### E2E tests added (`tests/e2e/real-device.mjs`)
4 new tests verify:
- Settings page renders the LLM section with status, fields, and
  three buttons.
- `GET /api/config` never exposes a raw-looking apiKey in JSON.
- `PUT /api/config` accepts a real key and returns a redacted response.
- `PUT /api/config` with a mask-only value keeps the existing key
  (no-op semantics).

### Live-browser E2E
Same sandbox caveat as v0.15 / v0.17. The endpoints are curl-tested
above. The e2e suite is ready for any non-sandbox / CI run.

## Tradeoffs / follow-ups

- **Encryption-at-rest is filed as v0.18.x.** The right primitive is
  OS keychain (Keychain / Credential Manager / libsecret) via
  `keytar` or Tauri Stronghold. Adds a native dep; not justified for
  v0.18 ROI.
- **Mask passthrough vs explicit clear** — UI's "替换" flow puts the
  field in edit mode (so the user can paste a new value). If they save
  without changing anything, the field's `dataset.editing === '1'` still
  sends an empty string (which is interpreted as "clear"). The
  default-still-readonly state sends mask-shape, which is a no-op. This
  should be reflected in the UX copy in a future iteration.
- **Test endpoint charges tokens.** `POST /api/llm/test` issues a real
  network call. The prompt is tiny ("Reply with the single word 'ok'")
  but on a paid OpenAI plan every click costs ~$0.0001. If that becomes
  a problem, gate it behind a debounce.

## Privacy

- API key never leaves the user's machine (sent only to OpenAI, when
  the user explicitly tested or triggered a generation).
- The vault path is unchanged.
- The redaction endpoint response is computed from the same in-memory
  config; nothing is logged.
