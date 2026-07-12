# Decisions Log

> Chronological. Cross-cutting decisions (not just ADRs). Newest first.

## 2026-07-12

- **v0.4 direction decided**: Tauri 2.0 desktop, Linux first, wraps existing web frontend
- **Product positioning evolved**: from "Personal Knowledge Base" to "Personal Cognitive OS"
- **AI features roadmap** (5 phases): Daily Journal → Knowledge Graph → Reflection Agent → Decision Journal → Personal Agent
- **Privacy stance hardened**: AI features default to local LLM, API opt-in per session
- **Harness adopted**: ai-engineering-harness for project organization

## 2026-07-11 (v0.3 release)

- **Wikilink autocomplete** — primary new feature
- **Smart mentions** — auto-link known entity names
- **Inline status popover** — click status pill to change without modal
- **Tag filter chips** — multi-select with AND logic
- **Bug fix**: marked v14 API change (link/image renderers now take objects, not positional args)
- **Bug fix**: lenient frontmatter parser handles user-edited YAML

## 2026-07-11 (v0.2 release)

- **Design language**: type-color identity (orange/sky/violet/emerald)
- **Display font**: Fraunces serif for titles
- **UI font**: Inter for body
- **Code font**: JetBrains Mono
- **Brand mark**: 4-quadrant colored square
- **Cmd+K command palette**
- **Drag-and-drop kanban**
- **Three themes**: light / dark / sepia

## 2026-07-12 (decisions ratified)

- **Tauri strategy (ADR-0001)**: wrap existing web frontend, no rewrite
- **LLM strategy (ADR-0002)**: OpenAI-compatible adapter primary, local-echo fallback, pluggable
- **Repo strategy (ADR-0003)**: Monorepo with pnpm workspaces — `packages/{core, web, desktop, agent}`
- **Data schema (ADR-0004)**: JSONL + SQLite FTS5 dual storage
- **UI strategy (ADR-0005)**: Desktop = Productive Cockpit, Web = Landing Page (Image 1 style)
- **Agent protocol (ADR-0006)**: Adopt MCP — Second Brain ships an MCP server so Claude Desktop / Codex CLI / Hermes can call us
- **Capture layer**: 3 channels (file watcher, HTTP webhook, MCP tool) — to be designed in v0.5

