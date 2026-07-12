# PROJECT_STATUS.md

_Last updated: 2026-07-12 by @coordinator_

> This is the live kanban. Update at every Issue transition. Authoritative for human readers.

## Now (in progress)

_None. Bootstrap is in progress. v0.4 (Tauri migration) is next._

## Backlog

| Issue | Title | Size | Class | Phase |
|---|---|---|---|---|
| #TBD | v0.4: Tauri v2 desktop shell (Linux first) | L | A | Tauri migration |
| #TBD | v0.4.1: Tauri config + capabilities + dev workflow | M | A | Tauri migration |
| #TBD | v0.4.2: Re-embed existing web frontend as Tauri webview | M | A | Tauri migration |
| #TBD | v0.4.3: Tauri commands for vault I/O (replaces Node HTTP) | L | A | Tauri migration |
| #TBD | v0.4.4: Tauri release pipeline (Linux AppImage + .deb) | M | A | Tauri migration |
| #TBD | v0.5: Event stream collector (file-watch, app events) | L | A | AI Daily Memory |
| #TBD | v0.5.1: SQLite + FTS5 schema + migrations | M | A | AI Daily Memory |
| #TBD | v0.5.2: Daily Journal agent (event → reflection → notes) | L | AI | AI Daily Memory |
| #TBD | v0.5.3: Local LLM integration (Ollama / llama.cpp) | M | A | AI Daily Memory |
| #TBD | v0.6: Knowledge graph (sqlite + LanceDB or pure SQL) | XL | A | Knowledge Graph |
| #TBD | v0.6.1: Backlinks panel on detail page | M | F | Knowledge Graph |
| #TBD | v0.6.2: Semantic search across all entities | M | AI | Knowledge Graph |
| #TBD | v0.6.3: Graph visualization (canvas/SVG) | M | F | Knowledge Graph |
| #TBD | v0.7: Reflection Agent (weekly pattern detection) | L | AI | Reflection |
| #TBD | v0.8: Decision Journal | M | F | Decision |
| #TBD | v0.9: Personal Agent (skill distillation + chat with memory) | XL | AI | Personal Agent |
| #TBD | v0.10: Knowledge distillation (lora-*.skill files) | L | AI | Personal Agent |
| #TBD | v0.11: Web showcase (separate static deploy) | M | A | Showcase |
| #TBD | v0.12: Self-hosted sync (Syncthing-friendly) | M | A | Sync |

## Blocked (Waiting for Approval / external)

_None._

## Recently Merged

| PR | Title | Evidence |
|---|---|---|
| #N/A | v0.3.0 — Wikilink autocomplete + smart mentions + status popover + tag filter | [docs/evidence/v0.3/](docs/) |
| #N/A | v0.2.0 — design + UX overhaul | docs/ |
| #N/A | v0.1.0 — initial public release | docs/ |

## Open Reviewer Threads

_None._

## Phase

- **Phase 0 — Bootstrap** — In progress
- **Phase 1 — Tauri shell (v0.4)** — Planned
- **Phase 2 — Event stream + Daily Memory (v0.5)** — Planned
- **Phase 3 — Knowledge Graph (v0.6)** — Planned
- **Phase 4 — Reflection + Decision (v0.7–v0.8)** — Planned
- **Phase 5 — Personal Agent (v0.9+)** — Planned

## Health

- **Tests**: web SPA covered by Playwright e2e. Backend has no automated tests yet (TBD).
- **Documentation**: AGENTS.md, PROJECT_STATUS.md, docs/{product,architecture,design,decisions,evidence,sessions} skeletons in place.
- **Adoption risk**: Tauri migration might break existing users (TBD).
- **Known tech debt**: Node HTTP API duplicates what Tauri commands can do (will be deprecated in v0.4.3).
- **Open design questions** (see `docs/decisions/`): 4 (listed in next section).

## Critical Decisions Pending Human Input

1. **Tauri webview strategy** — Reuse existing `public/` as-is, or rewrite in a Tauri-native UI framework? → see ADR-0001 draft
2. **Repo split** — Single repo with `src-tauri/` subdir, or separate `second-brain-web` and `second-brain-desktop` repos?
3. **AI inference** — Local-only (Ollama / llama.cpp), API-only (OpenAI / Anthropic), or both with user choice?
4. **v0.5 priority** — Event stream collector first, or daily journal generator first?
