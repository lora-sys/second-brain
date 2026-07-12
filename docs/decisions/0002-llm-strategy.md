# ADR-0002: LLM inference — OpenAI-compatible adapter first, local optional

- **Status**: Accepted
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.5 (TBD)

## Context

The user's "second brain" content is private but they primarily plan to use API-based LLMs (OpenAI / Anthropic-compatible) via `.env` keys. Local LLM is a nice-to-have. We need an adapter pattern that:
- Works with OpenAI out of the box (via `.env`)
- Is extensible to Anthropic, Ollama, llama.cpp, etc.
- Doesn't leak content to a provider without explicit opt-in
- Lets the user audit every prompt and response

## Decision

**Primary: an OpenAI-compatible adapter**, configurable via `.env` (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`).

**Pluggable:** `LLMProvider` trait so we can add Anthropic / Ollama / llama.cpp / vLLM / etc. later.

**Every prompt and response is logged** to the vault under `00-AI/prompts/<date>/<id>.md` and `00-AI/responses/<date>/<id>.md` for audit.

**The user explicitly opts in to a provider** per session via Settings (not per call) — the toast "你的内容已发到 <provider>" appears on first call.

**A "local echo" stub provider** ships by default so the daily-journal feature works even without any API key. It produces a templated reflection (event grouping, no LLM-generated prose) — not a real LLM, but a useful fallback.

## Alternatives Considered

- **Local-only hard (Ollama, no API)**: rejected — user explicitly wants API path with `.env`
- **Cloud-only (OpenAI only)**: rejected — must be pluggable
- **Local-only with API as opt-in, no .env convenience**: rejected — `.env` is the most ergonomic onboarding

## Consequences

### Positive
- Works out of the box with any OpenAI-compatible endpoint (OpenAI, Azure, Together, Groq, Ollama's OpenAI mode, vLLM, etc.)
- `.env` is the standard config convention
- Logged prompts = auditable AI behavior
- Fallback local-echo means the app still works offline / without keys

### Negative
- Default onboarding sends content to a third party if user configures `.env` and forgets
- OpenAI's API format adds an extra layer (chat completion, function calling) we have to wrap

### Mitigations
- Visible toast on first API call per session
- "Provider" indicator always visible in the topbar
- Settings UI shows the active model + last call timestamp
- `.env.example` ships with helpful comments about what each key does
- All prompts and responses are local files in the vault — the user owns the audit trail

## Adapter interface (Rust)

```rust
#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, LlmError>;
    fn info(&self) -> ProviderInfo; // name, model, costs
}

pub struct ProviderInfo {
    pub name: String,           // "openai", "anthropic", "ollama", "local-echo"
    pub model: String,          // "gpt-4o-mini", etc.
    pub is_local: bool,
}
```

## Follow-ups

- v0.5.3: OpenAI adapter + local-echo stub
- v0.5.x: Anthropic, Ollama, llama.cpp adapters
- v0.9: Agent Protocol (MCP server) so external AIs can call us back
