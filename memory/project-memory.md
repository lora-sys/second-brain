# Project Memory

> Stable facts about the product. Anything time-bound or task-specific goes in `memory/decisions.md` or `sessions/`.

## Product

- **Name**: Second Brain OS
- **Tagline**: "Not 'save things' — continuously understand a person's state."
- **Type**: Local-first Personal Cognitive OS
- **Form factor**: Web SPA (v0.1–v0.3) → Tauri desktop (v0.4+), Linux first
- **Storage**: Obsidian Vault, markdown + YAML frontmatter
- **AI**: Local LLM only by default, optional API opt-in
- **Privacy**: No telemetry, no cloud sync, no accounts

## Users

- **One person, the developer** (lora). Real persona, not a hypothetical.
- Uses Obsidian for personal notes, projects, tasks
- Wants: a single tool that does it all, local + private, helps reflect

## Capabilities (shipped in v0.3)

- 4 entity types: person, task, project, link
- CRUD with atomic file writes
- Kanban with drag-and-drop status changes
- Inline status popover
- Wikilink autocomplete (`[[` trigger)
- Smart mentions (auto-link known entity names)
- Tag filtering
- Themes: light / dark / sepia
- Markdown rendering with `marked` v14
- Lenient frontmatter parser (handles user-edited files)

## Tech stack

- **Backend (v0.3)**: Node.js vanilla HTTP, js-yaml, jsdom, marked
- **Frontend (v0.3)**: Vanilla JS, native HTML/CSS, no build, no framework
- **Storage**: Markdown + YAML in Obsidian Vault
- **Tests**: Playwright e2e via `playwright-cli`
- **Desktop (v0.4 TBD)**: Tauri 2.0, Rust commands
- **AI (v0.5 TBD)**: Ollama / llama.cpp for local LLM

## Non-goals (permanent)

- ❌ Cloud sync
- ❌ Telemetry by default
- ❌ Social / collaboration
- ❌ Mobile app (TBD)
- ❌ Replacing Obsidian
- ❌ Polished auto-written prose that hides raw event stream

## Code locations

- `public/` — web SPA (HTML/CSS/JS)
- `lib/` — Node HTTP server, vault I/O
- `server.mjs` — entry
- `package.json` — deps (js-yaml, jsdom, marked)
- `config.json` — user-overridable runtime config (vault path, port, etc.)
- `docs/` — product / architecture / design / decisions / evidence
- `memory/` — stable project facts
- `sessions/` — per-session logs
- `src-tauri/` (TBD v0.4) — Rust desktop shell

