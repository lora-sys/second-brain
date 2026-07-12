# Architecture Memory

> Current architecture. Update when ADRs change or major refactors land.

## Current (v0.3)

- **Single process Node server** at `server.mjs`, vanilla HTTP on 127.0.0.1:3939
- **Static SPA** at `public/`, served by the same server
- **Vault I/O** through `lib/vault.mjs` — atomic writes, slug generation, wikilink resolution
- **Markdown rendering** via `marked` v14 with custom renderer for `[[wikilink]]` syntax
- **Lenient frontmatter** via `lib/frontmatter.mjs` `parseYamlLenient` — salvages what it can when YAML is broken

## Planned (v0.4+)

- **Tauri 2.0 shell** — Rust commands, webview loads the existing `public/`
- **Capability-based FS access** — no shell, only explicit vault commands
- **Event stream** — JSONL in `00-AI/events/` + SQLite FTS5 index
- **Local LLM** — Ollama / llama.cpp adapter pattern

## Key decisions

- ADR-0001: Tauri wraps web frontend, no rewrite
- ADR-0002: Local LLM only by default
- ADR-0003: Single repo, `src-tauri/` subdir
- ADR-0004: JSONL + SQLite hybrid storage
