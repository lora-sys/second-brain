# v0.30 — Real LLM Agent · Adversarial Review

## Self-review

### Bug-hunter

- **r.error swallowed in fallthrough**: in `callAgentWithFallback`, when
  the server returns `{ error: "..." }` we still set `apiError`. The
  UI inline-warning is correct. But before v0.30 this path was the
  silent local-echo; v0.30 makes the failure visible.
- **`skill:slug` prefix collision**: if a user prompt literally starts
  with "skill:mood" but they have no `mood` skill, `readSkill` throws
  ENOENT → caught by `try { … } catch {}`. No information leak.
- **Concurrent `/api/agent` calls share the rate-limit budget of the
  underlying LLM.** Not a bug, just a known limitation. Cited in
  tradeoffs.

### Behavior reviewer

- The empty-prompt → 400 boundary is server-side and consistent
  with `/api/daily`. Frontend already calls
  `await window.__api.api.post('/api/agent', …)` only when the user
  has typed something, so 400 is rare in practice but defensive.
- The fallback preserves the old in-browser behavior byte-for-byte.
  Tests `agent: status cards show provider/model/status/privacy`,
  `agent: composer with input + 5 quick prompts`, etc. (the old
  tests) continue to apply.
- New meta prefix `↗ real LLM` warns the user that their typed
  text left the machine — a privacy decision they should make
  consciously.

### Architecture reviewer

- **`runAgent` is a single function**, taking opts in, returning
  the result. No internal state. Testable in isolation.
- **Caching**: `CachedProvider(ttlMs: 30_000)` wraps the OpenAI
  provider so repeated identical prompts in a 30-second window hit
  cache. Useful for the "type the same prompt twice" user behavior.
  Disable by setting `llm.apiKey` to an unconfigured state; cache
  doesn't apply to LocalEchoProvider.
- **Privacy is a load-bearing ADR constraint.** ADR-0009 names the
  system prompt's content budget (counts + 5 most-recent + skill
  names) so future contributors don't accidentally widen the LLM
  payload.
- **`lib/agent.mjs` did not gain new deps.** Same with v0.18.

### Security reviewer

- **Prompt injection** in the user's typed prompt: a hostile
  prompt could try to exfiltrate the system prompt's contents or
  embed illicit instructions for the LLM. The OpenAI provider
  passes through user-controlled text as `messages[-1].role =
  'user'`. Provider-side prompt-injection mitigations are the
  LLM-vendor's responsibility (and the user's prompt is already
  shipped — they typed it).
- **Vault content leak**: the system prompt exposes counts and 5
  most-recent titles + slugs. Not full vault. Acceptable.
  Documented in ADR-0009.
- **No new attack surface in the browser**: the SPA already calls
  `window.__api.api.post`; we just call it on a new path.
- **Sanitize layer (v0.17) still applies** to the agent's response
  before reaching the DOM — but the agent now returns plain text,
  not HTML, so sanitize is a no-op for this path.

### UI reviewer
N/A — the only visible change is the meta line in chat bubbles.
