# ADR-0008: LLM Configuration — Promoted from env to in-app settings

- **Status**: Accepted
- **Date**: 2026-07-16
- **Deciders**: @coordinator
- **Supersedes part of**: ADR-0002 (env-var input mechanism only)

## Context

v0.5 (event stream + daily journal) and v0.7 (weekly reflection) read LLM
credentials from process env vars (`OPENAI_API_KEY`, `OPENAI_BASE_URL`,
`OPENAI_MODEL`). Forcing users to edit `.env` is friction:

- The project's `config.json` is already the user-overridable settings file
  (vault path, port, host, directories). Adding LLM there is consistent.
- The roadmap v0.18 explicitly asks for "in-app settings panel" for the
  API key.
- New users (or anyone running via a packaged Tauri build) don't easily
  reach `.env`.

Trade-off: storing a secret in `config.json` (plaintext on disk) is
acceptable because:

1. The vault path is already plaintext in the same file — equivalent trust.
2. `config.json` is local to the user's machine (local-first principle).
3. The OS-level file permissions and the app's own local-only bind are
   the existing security boundary.

Threat model:
- Anyone with read access to `~/.secondbrain/config.json` can read the
  key. Same threat as anyone with shell access.
- We do not log the key (logger strips it from the request/response log).
- We do not return the raw key over HTTP `GET /api/config`.

## Decision

1. **Add `llm.{apiKey, baseUrl, model}` to `config.json`.**
   All three default to empty strings. Empty values fall through to
   process env vars (`OPENAI_API_KEY` etc.) so existing deployments
   without a config update keep working.

2. **`GET /api/config` masks the API key.**
   - Empty → `{ llm: { apiKey: '', configured: false, baseUrl, model } }`.
   - Set → `{ llm: { apiKey: '<mask>', configured: true, baseUrl, model } }`
     where the mask is `xxxx…<last4>` of the original.

3. **`PUT /api/config` accepts raw values.**
   - Body shape: `{ llm: { apiKey, baseUrl, model } }`.
   - Empty string clears; non-empty replaces.
   - Missing field is a no-op for that field.

4. **`lib/daily.mjs` and `lib/weekly.mjs` accept an `llm` opt object.**
   `pickProvider({ apiKey, baseUrl, model })` resolves in priority order:
   in-call args → env vars → built-in defaults.

5. **Settings page adds three inputs.**
   - API key: a masked input field with a "替换" button that toggles to
     a plain input; "清除" button to clear.
   - Base URL: empty default.
   - Model: empty default.
   - Status badge: "已配置 (sk-...xxxx)" / "未配置 → using local-echo".

6. **Tauri mode follows the same path.**
   `config_get` / `config_set` carry the new keys through unchanged —
   they already serialize the entire config object.

7. **Encryption-at-rest is out of scope.**
   Filed as `v0.18.x`. The right primitive is OS keychain (Keychain on
   macOS, Credential Manager on Windows, libsecret on Linux) via the
   `keytar` or `tauri-plugin-stronghold` APIs; both add native deps
   that are not yet justified for the v0.18 ROI.

## Consequences

- Users no longer edit `.env` to enable cloud LLM.
- A new masked-key UX pattern is established for future secrets
  (e.g. a future v0.X LLM provider that needs a region / project key).
- No new dependency. No ADR-blocker.
