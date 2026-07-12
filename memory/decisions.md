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


## 2026-07-12 (v0.4.1 done, agent app readiness check)

- **Monorepo bootstrap landed** — `lib/` → `packages/core/`, pnpm workspace, 4 LLM adapter files added
- **Concurrency primitives added** — `withFileLock` + `withLockedMutation` in vault.mjs
- **LLM adapter pattern established** — `LlmProvider` interface, `LocalEchoProvider` (deterministic stub), `CachedProvider`, `RetryProvider`, `createOpenAIProvider`
- **AI audit log** — every tool call written to `00-AI/audit/YYYY-MM-DD/<ts>.md`
- **.env.example shipped** — 52 lines of documented config (CRITICAL: never commit .env)
- **Self-review caught real issues** — stale locks, atomic write, narrow barrel, etc. Follow-up issues #2, #3 filed
- **Agent app audit** — 10 gaps identified in concurrency, conversation history, E2E AI testing, etc.

## 2026-07-12 (v0.4.x WIP stabilized, cockpit skeleton + flat lib/ landed)

- **Flat lib/ structure restored** (commit 43f4183) — v0.4.1's pnpm monorepo was reverted because the ceremony wasn't earning its keep yet. We have one app, one repo, one set of deps. LLM adapter interface (`LocalEchoProvider` / `CachedProvider` / `RetryProvider` / `createOpenAIProvider`) and `withFileLock` concurrency primitives survived the move intact.
- **ADR-0003 status → Superseded** — to be formalized as ADR-0007 ("flat lib/ at root, monorepo deferred to v0.5+"). Trigger conditions for revisiting monorepo: (a) we add a second deployable (Tauri + something else), (b) we add the agent package with its own deps, or (c) we exceed 3 npm deps for the web SPA.
- **Cockpit UI shipped as web overlay (commit ab79c3b)** — `?cockpit=1` toggles the cockpit shell which re-parents the existing `#main` element into a new sidebar+main layout. Console-clean, 6 screenshots captured. Self-review approved after one fix (vault name refresh).
- **Cockpit re-parenting trick** — `adoptV3Elements()` moves `#main` from `.app` into the cockpit content area, letting `renderDashboard` / `renderTasks` / `renderLinks` write into the cockpit without modification. Documented coupling; will be replaced by `invoke()` in v0.4.5.
- **Toolchain confirmed for Tauri 2.0** — cargo 1.97, rustc 1.97, cargo-tauri 2.11.4, webkit2gtk-4.1 2.52.5 are all installed. Can actually build Tauri in this env.

## 2026-07-12 (v0.4.3 Tauri init landed)

- **Tauri 2.0 shell scaffolded** (commit 84b16cb) — `src-tauri/` with Cargo.toml, tauri.conf.json, src/{main,lib}.rs, capabilities/default.json, icons/. Identified as `com.secondbrain.app`, 1400x900 native window, dev URL = `http://localhost:3939`, frontend dist = `../public`.
- **Toolchain confirmed locally** — cargo 1.97, rustc 1.97, cargo-tauri 2.11.4, webkit2gtk-4.1 2.52.5, rsvg2 2.62.3. AppImage + .deb + .rpm bundles can be built in this env.
- **Security posture for v0.4.3** — no shell plugin, no fs plugin, no http plugin. Only `core:default` + explicit window perms. Documented in lib.rs top comment + capabilities/default.json.
- **Known env limitation** — sandbox has no GPU, GDK falls back to software rendering for WebKit; screenshots from `PIL.ImageGrab` don't always show the webview content. Window chrome / native decorations do show in the screenshot, proving the shell works. Full UI verification waits for v0.4.7 on a real Linux machine.
- **Scope discipline for v0.4.3** — the shell launches but does NOTHING yet (no vault commands). All vault ops still go through the Node HTTP server. The next issue (v0.4.4) ports at least `vault_list` + `config_get` to Rust commands so release builds actually work.
