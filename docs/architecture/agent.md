# Agent (LLM)

> Status: planned v0.5. This doc defines the architecture; implementation is v0.5+.

## Adapter pattern

```rust
#[async_trait]
pub trait LlmProvider: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, LlmError>;
    fn info(&self) -> ProviderInfo;
}
```

Impls:
- `OllamaProvider` — talks to local Ollama
- `LlamaCppProvider` — talks to llama.cpp server
- `AnthropicProvider` — cloud (opt-in only, per ADR-0002)
- `OpenAiProvider` — cloud (opt-in only)

## Prompt template system

- Prompts live as `.md` files in the vault under `00-AI/prompts/`
- Jinja-like placeholders: `{{events}}`, `{{date}}`, `{{persona}}`
- Templates versioned in git
- Each prompt invocation logged with template name + token count

## Daily Journal generator (v0.5)

Pipeline:
1. Read today's `events.jsonl`
2. Filter to last 24h
3. Call LLM with `prompts/daily-reflection.md` template
4. Parse structured output (sections: 今天做了什么 / 学到了 / 决定 / 待解决)
5. Write to `<vault>/00-Daily/YYYY-MM-DD.md`

## Reflection Agent (v0.7)

Weekly:
1. Read past 7 days of journal entries + events
2. Look for patterns: stuck tasks, recurring themes, decisions
3. Generate a "reflection" doc: `<vault>/00-Weekly/YYYY-WNN.md`
