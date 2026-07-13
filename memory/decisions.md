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

## 2026-07-12 (v0.4.4 Tauri vault commands landed)

- **Two Rust commands shipped** (commit 3611244) — `config_get()` and `vault_list_all()`. Minimum viable: just enough to bridge the bundled Tauri app to the vault without a Node sidecar.
- **Decision: don't port every endpoint to Rust** — we picked the narrowest viable proof (2 commands, 8 tests, ~150 lines) over a full port. Other endpoints land as v0.4.4.x follow-ups.
- **YAML reimplemented in Rust** — `serde_yaml` with lenient fallback (returns `{}` on parse error, never panics). Mirrors `lib/frontmatter.mjs`'s `parseYamlLenient`. Tests pin the contract.
- **Config search order finalized** — `$SECOND_BRAIN_CONFIG` → cwd → `$XDG_CONFIG_HOME/second-brain/` → `~/.config/second-brain/`. The Tauri bundled app's first launch will likely fail to find a config; that's a UX problem for v0.4.7 (settings UI), not a v0.4.4 problem.
- **`walkdir` with `max_depth(1)`** — entity directories are flat by convention (no nested folders of .md files). Attachment subdirectories are out of scope.
- **Path canonicalization in `find_config`** — returned paths are absolute and stable. Tests that compare with `tempdir` paths now pass reliably.

## 2026-07-12 (v0.4.5 frontend rewire landed)

- **Tauri bridge in public/app.js** (commit pending merge) — probes both Tauri 2 (`window.__TAURI__.core.invoke`) and Tauri 1 (`window.__TAURI_INVOKE__`) shapes. Falls back to fetch if neither. Logs warn on invoke failure then falls through.
- **Rewired two methods** — `api.config.get()` and `api.list()` (no type). All other API methods still use fetch (no Rust counterpart yet).
- **Rust Config serialized as camelCase** — added `#[serde(rename_all = "camelCase")]`. Bug caught by Tauri-sim test: state.config.vaultPath was undefined in Tauri mode because Rust returned snake_case `vault_path`. Without the Tauri-sim test this would have shipped broken.
- **Tauri-sim test pattern** — inject a mock `window.__TAURI__` via Playwright's `addInitScript`, capture `window.__invokeLog` to verify which commands actually got invoked. This pattern is reusable for v0.4.7 (full E2E) and for any future bridge test.
- **`vault_list_all` returns Vec directly, JS wraps in {items}** — small shape adapter in `normalizeTauri`. v0.4.4 already returned Vec, JS expected {items: [...]}. Adapter is one line.

## 2026-07-13 (v0.4.c3 cockpit today panel landed)

- **Cockpit today panel shipped** (commit pending merge) — 3 blocks: 感悟 / 成就 / 关注. Self-contained, doesn't share rendering with v0.3 dashboard.
- **Refreshcounts made fire-and-forget in cockpitRoute** — the today panel computes from state.entities; awaiting /api/dashboard was blocking the panel render. The standard v0.3 boot still uses the awaited refreshCounts because it actually needs dashboard aggregates.
- **Entities pre-loaded in bootCockpit** — `api.list()` runs after config.get(); when entities arrive, re-render the today panel so it has real data.
- **Found and fixed a latent crash in server.mjs** — `(a.data.due || '').localeCompare(...)` blew up when js-yaml parsed `due: 2026-07-12` as a Date object (bare ISO timestamps are auto-parsed). Without this fix, /api/dashboard returned 500 and EVERY consumer (cockpit + standard) showed the spinner forever. Wrapped with `String(...)` coercion.
- **Vocab mismatch surfaced** — tasks with `status: open` or `doing` aren't counted in tasksByStatus because the server checks for `todo`/`in_progress`. Filed as v0.4.c3 polish.

## 2026-07-13 (v0.4.c4 cockpit right rail landed)

- **Right rail shipped** (commit pending merge) — 任务与提醒 + 即将到来. 2-column layout with sticky rail. The "today panel" is now: header + 3-block grid (main) + 2-block rail.
- **Relative due labels** — "逾期 N 天 / 今天 / 明天 / N 天后" via `parseDateOnly + diff`. Cleaner than showing raw dates in the UI.
- **Priority badge** — `高` (red pill) / `低` (gray pill) / null. Hard-coded map for now.
- **Tasks pre-loaded via api.list()** in bootCockpit (c3 work) feeds the rail. Without that, the rail would be empty.
- **TZ bug noted** — `js-yaml` parses `due: 2026-07-12` as UTC midnight Date. In TZ east of UTC, this becomes the previous day local. Tasks due "today" appear as "yesterday" locally. Filed as v0.4.c4 polish (strip time component when comparing).
