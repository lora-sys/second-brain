# v0.30 — Real LLM Agent · Change Summary

## What changed

The cockpit's 智能体 used to run an in-browser local-echo function
(`agentComplete`) that keyword-matched against loaded entities and
returned canned text. v0.30 replaces that path with a real LLM call
when the user has configured an API key in ADR-0008. The in-browser
fallback is preserved for users without a key and for transient
network errors.

## Implementation

### New file: `lib/agent.mjs` (162 lines)
- `pickProvider(opts)` — same shape as daily/weekly.mjs, returns
  `CachedProvider(OpenAI-compatible)` when `apiKey` or `baseUrl` is
  set, else `LocalEchoProvider`.
- `runAgent({ prompt, vaultPath, llm, maxTokens, temperature })` —
  resolves matched skills via `matchSkills(listSkills(vaultPath),
  prompt)`, builds a compact system prompt with vault counts + the 5
  most-recent entity titles, then calls the configured provider.
- System-prompt summarisation is intentionally narrow: counts + 5
  most-recent items + matched-skill names. No bulk export.

### Modified files

- **`lib/server.mjs`** — `POST /api/agent` endpoint. Body
  `{ prompt }`; returns `{ text, provider, durationMs, error?,
  skillsLoaded }`. Always 200 — provider errors are returned in
  the `error` field, letting the browser fall back without an extra
  HTTP-error round-trip.

- **`public/lib/cockpit.js`**:
  - `callAgentWithFallback(prompt, state, skills)` — tries
    `POST /api/agent`. On success returns the server's text +
    provider info; on error falls back to the in-browser
    `agentComplete` and flags the result with `apiError` so the UI
    surfaces a "⚠ API 调用失败" warning.
  - `localEchoActions(prompt, state)` — mirrors the action-detection
    regex from `agentComplete` so action buttons still execute when
    the server path is taken.
  - The per-message meta line now reads
    `↗ real LLM · openai-compatible · gpt-4o-mini · 1234ms · 2
    skill(s) 注入`, and shows the warning when the API call
    failed.

### Tests
- **`tests/agent.test.mjs`** (new) — 16 unit tests for `runAgent` and
  `pickProvider`:
  empty prompt, no-config local-echo fallback, `skill:slug` resolves
  to skill body, low maxTokens completes, error path with an
  unreachable URL returns the `error` field (no throw),
  `pickProvider` with empty config falls back to local-echo.
- **`tests/e2e/real-device.mjs`** (+4 tests):
  - `/api/agent` with empty prompt → 400.
  - `/api/agent` with prompt → 200 with provider info.
  - `/api/agent` GET → 404 (POST only).
  - cockpit agent UI dispatches to `/api/agent` and renders the
    new meta line.

### Constraints honored
- **No new npm deps** (still 3: js-yaml, jsdom, marked).
- **Privacy**: only the user's typed prompt + compact vault summary
  ships to the configured LLM. No bulk vault export.
- **Backward-compatible**: when `llm.apiKey` is empty (default), the
  configured provider is `LocalEchoProvider`, identical to the
  existing in-browser behavior.

## Verification

### Unit (16/16 pass)
```
$ npm run check
…
16 passed, 0 failed    (agent.test.mjs — new)
33 passed, 0 failed    (llm-config.test.mjs — v0.18)
57 passed, 0 failed    (cockpit-activity.test.mjs — v0.16)
31 passed, 0 failed    (sanitize.test.mjs — v0.17)
```
Total: 137 unit tests.

### End-to-end smoke (worktree server on :3943)

```
$ curl -X POST http://127.0.0.1:3943/api/agent \
       -d '{"prompt":"我有哪些未完成的任务?"}'
{
  "text": "[local-echo] 你是 Second Brain…",     // local-echo fallback when no key
  "provider": { "name": "local-echo", "model": "deterministic-stub", "isLocal": true },
  "durationMs": 15,
  "error": null,
  "skillsLoaded": 0
}

$ curl -X POST -d '{"prompt":""}' http://127.0.0.1:3943/api/agent
{ "ok": false, "error": "prompt is required" }    // 400

$ curl http://127.0.0.1:3943/api/agent              // GET
{ "error": "Not found: POST /api/agent" }         // 404
```

To exercise the real LLM path: set `llm.apiKey` in config.json (the
v0.18 settings panel) and the next `/api/agent` call will issue a
real OpenAI request.

## Tradeoffs / follow-ups

- **No streaming response.** A long answer takes a few seconds before
  appearing. Filed as v0.31.
- **No multi-turn context.** Each turn sends only the latest prompt
  + a fresh system prompt. Conversation history isn't included.
  Filed as v0.31.x.
- **No tool-use via the LLM.** Action detection still uses the
  regex from v0.5.5. A future v0.32 could pass actions as a
  function-calling schema and let the model pick.
- **No cost cap.** The user can issue as many `/api/agent` calls as
  they want. For real-money LLM, a per-day cap would be nice. Filed
  v0.30.x.

## Privacy

- Only the user's typed prompt + a compact system-prompt summary
  (counts + 5 most-recent items by title + skill names) ships to
  the LLM. No bulk vault export.
- The server does not log either side of the LLM conversation.
- The browser's localStorage cache (`sb-agent-history-v1`) is
  unaffected.
