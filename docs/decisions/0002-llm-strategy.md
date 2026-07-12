# ADR-0002: LLM inference is local-only by default

- **Status**: Proposed
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.5 (TBD)

## Context

The user's "second brain" content is private. Sending it to a remote API by default would violate the local-first promise. But local LLMs have smaller context, slower inference, and may miss cloud-only models.

## Decision

**Default: local LLM only.** No API key, no cloud call, no telemetry.

**Opt-in API support** for users who:
- Have no GPU / can't run a local model
- Want a specific model only available via API
- Are OK sending their content to that provider

Every API call is a separate opt-in per session, with a visible "your content was sent to <provider>" toast.

## Alternatives Considered

- **API-only (OpenAI / Anthropic default)**: Faster to ship, but privacy-violating. Reject.
- **Local-only hard (no API ever)**: Most private. But excludes users without local models. Punt — design for it but don't ship it.
- **Both, with no UI clarity**: Confusing. Users won't know what's happening.

## Consequences

### Positive
- Privacy by default — vault content never leaves the machine without explicit action
- No surprise costs
- Works offline
- Aligns with the product's core promise

### Negative
- Smaller model context windows
- Slower inference on consumer hardware
- Need to maintain Ollama / llama.cpp adapter

### Mitigations
- Adapter pattern: `LLMProvider` trait, multiple impls, future-proof
- Cache prompt templates in vault for transparency
- Surface "local model not detected" in onboarding with download link

## Follow-ups

- v0.5.3: LLM adapter implementation
- v0.5.16: prompts audit system

