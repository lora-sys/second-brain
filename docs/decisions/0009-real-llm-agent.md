# ADR-0009: Cockpit Agent — Real LLM Integration

- **Status**: Accepted
- **Date**: 2026-07-16
- **Deciders**: @coordinator
- **Related**: ADR-0002 (LLM strategy), ADR-0006 (MCP), ADR-0008 (config panel)

## Context

The cockpit's 智能体 section currently runs `agentComplete()` in-browser —
a deterministic local-echo that answers from keyword matching against the
loaded entity state. The roadmap v0.30 explicitly calls for replacing this
with a real LLM call when one is configured.

The plumbing was already laid by v0.18:
- `lib/server.mjs#pickProvider(llmOpts)` builds a `CachedProvider(OpenAI-compatible)`
  when the user has set `llm.apiKey` or `llm.baseUrl` in `config.json`,
  else falls back to `LocalEchoProvider`.
- `POST /api/llm/test` lets the user probe the configured provider from
  the settings page.
- `lib/daily.mjs` and `lib/weekly.mjs` already use `pickProvider` — the
  bug fix in v0.18 made weekly.mjs's path actually work for the first
  time.

What's left:
1. A server endpoint that takes a prompt + matches skills, calls the
   configured provider, returns the response.
2. Browser-side: replace `agentComplete(text, state, skills)` (in-browser
   local-echo only) with a `getAgentResponse(prompt, state, skills)` that
   tries the server first, falls back to in-browser local-echo if the
   call fails.

## Decision

**Add `POST /api/agent`**, implemented in a new `lib/agent.mjs`. The endpoint:

1. Reads the LLM config (`getLlmOpts(cfg)`).
2. Reads the user's prompt from the body.
3. Finds matching skills via `matchSkills(listSkills(vault), prompt)`.
4. Builds a compact system prompt that includes:
   - Today's date and timezone (so the model can resolve "上周", "去年").
   - A bullet of vault counts (人物 X, 任务 Y, 项目 Z, 链接 W).
   - A bullet of the top 5 most-recent vault entities by `updated`.
   - A bullet list of matched skills (name + description only, not body —
     body would compete with the model's own reasoning).
   - One sentence of system instruction in Chinese.
5. Calls `pickProvider(llmOpts).complete({ system, prompt, maxTokens: 500,
   temperature: 0.4 })`.
6. Returns `{ text, provider: { name, model, isLocal }, durationMs, error?,
   skillsLoaded }`.

On any provider error, the server still returns 200 with `error` set; the
client uses the in-browser `agentComplete` as the visible fallback. This
keeps the page working even when the network is down.

**Privacy**: the server only ships to the configured provider what the user
typed + the compact system-prompt summary. It does NOT ship full vault
content. The system-prompt summary is intentionally narrow: counts and
the 5 most-recent items by title + slug only.

**Browser contract**: `getAgentResponse(prompt, state, skills)` is the new
single entry point. It tries `/api/agent`, falls back to the in-browser
local-echo on 5xx. The action regex (`create_task`, `mark_done`) still
runs in the browser — it's deterministic and doesn't need an LLM.

**UI changes**:
- Provider badge in the response meta line: previously always said
  `local-echo · ...`. Now it can say `openai-compatible · gpt-4o-mini ·
  1234ms · 2 skill(s) 注入` or similar.
- If the server call failed, an inline warning: "⚠ API 调用失败,使用本地推理"
  in addition to the local-echo fallback text.

## Consequences

- The agent no longer silently only does local-echo. With a configured
  key, it issues real LLM calls.
- Network errors are visible to the user (inline warning), not silent.
- Token cost: each turn makes one OpenAI call (~500 output tokens
  max). For a $0.15 / 1M output model that's ~$0.0001 per turn.
- The user's vault content remains local — no bulk export to a remote
  LLM, just the small system prompt.

## Open follow-ups

- **Conversation memory across turns** is out of scope. The server
  returns one text per turn; the browser stitches them together in
  history. Multi-turn context window for `/api/agent` is filed as
  v0.30.x.
- **Streaming** would lower perceived latency but adds complexity
  (SSE / fetch-readable-stream). Filed for v0.31 or later.
- **Tool-use** for "新建任务" / "标完成" via the LLM instead of regex is
  filed for v0.32.
