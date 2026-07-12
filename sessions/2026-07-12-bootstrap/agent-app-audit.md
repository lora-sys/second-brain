# Self-Audit — Agent App Readiness

_Conducted by @coordinator on 2026-07-12 in response to user's "agent app" flag._

## The user's flag

> "咱们是agent app !! ... 注意接入ai测试，端到端测试，咱们这个是agent应用，必须测试在ai下，系统流畅相应，ai错误如何处理，工具调用失败如何处理，缓存啊，对话历史也没有存数据库"

Translation: "We're an agent app!! ... pay attention to AI integration testing, end-to-end testing. This is an agent app, must test under AI scenarios. System responsiveness, how to handle AI errors, how to handle tool call failures, caching, conversation history not stored in database."

## Audit by concern

### 1. AI error handling — **MISSING**
- No retry policy for transient LLM failures (rate limit, timeout, network)
- No fallback when LLM is unavailable (graceful degradation)
- No way to mark a "bad" AI output and retry
- No log of failed AI calls for debugging
- **Severity: HIGH**

### 2. Tool call failure handling — **MISSING**
- Tauri commands (planned) have no timeout
- No retry for transient filesystem errors
- No error messages surfaced back to AI in a way it can react to
- **Severity: HIGH**

### 3. Conversation history persistence — **MISSING**
- No conversation/session table planned
- No way to resume a conversation after restart
- No memory of what the AI did in past sessions
- **Severity: HIGH**

### 4. Caching — **MISSING**
- No LLM response cache (same prompt → same answer)
- No vault read cache (hot entities in memory)
- No debounce on event stream consumption
- **Severity: MEDIUM**

### 5. Concurrency — **MISSING**
- No file lock on vault writes
- Multiple AI sessions could write to the same file
- No coordination between file watcher and AI writes
- **Severity: HIGH**

### 6. End-to-end AI testing — **MISSING**
- No test infrastructure for LLM-backed features
- No way to verify "Daily Journal Agent produces sensible output" without an LLM
- No prompt snapshot tests
- No regression test for "AI suggestion was reasonable"
- **Severity: HIGH**

### 7. Secrets management — **PARTIAL**
- `config.json` exists but `.env.example` doesn't
- `OPENAI_API_KEY` mentioned in ADR-0002 but no .env loader
- Tauri command surface is for commands, not secrets
- **Severity: MEDIUM**

### 8. Telemetry/observability — **MISSING**
- No way to see "what is the AI doing right now"
- No log of AI tool calls
- No log of AI token usage / cost
- No way to pause / resume / cancel a long-running AI operation
- **Severity: MEDIUM**

### 9. Event stream dedup — **PARTIAL**
- File watcher will fire on every save (could be many)
- No debouncing
- No way to mark "this is a re-save, not a new edit"
- **Severity: MEDIUM**

### 10. AI safety — **PARTIAL**
- ADR-0006 says API is opt-in per session
- No rate limiting on AI tool calls
- No way to undo an AI-written change
- **Severity: MEDIUM**

## Summary of gaps

| # | Concern | Severity | Issue(s) to file |
|---|---|---|---|
| 1 | AI error handling | HIGH | v0.5.e1, v0.5.e2 |
| 2 | Tool call failure | HIGH | v0.4.4.x |
| 3 | Conversation history | HIGH | v0.5.c1, v0.5.c2 |
| 4 | Caching | MEDIUM | v0.5.m1 |
| 5 | Concurrency | HIGH | v0.5.l1, v0.5.l2 |
| 6 | E2E AI testing | HIGH | v0.5.t1, v0.5.t2 |
| 7 | Secrets | MEDIUM | v0.4.7 (Tauri config) |
| 8 | Observability | MEDIUM | v0.5.o1 |
| 9 | Event dedup | MEDIUM | v0.5.ev1 |
| 10 | AI safety | MEDIUM | v0.5.s1 |

## Action plan

Phase 0 close-out (today): file all HIGH-severity issues in GitHub.
Phase 1 (v0.4.x): every PR must include an AI-error / tool-failure test case.
Phase 2 (v0.5): build out the full agent-app infrastructure.
Phase 5 (v0.9): harden with rate limiting, undo, audit log.

## Memory note

> **Lesson learned**: An "agent app" has 2x the surface area of a regular app. Every UI feature has an AI counterpart. Every error path has a "what does the AI see" variant. Testing can't be just happy-path screenshots — it has to include "what if the LLM hallucinates" scenarios.

Add to `memory/lessons.md` after this audit is filed.
