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

## 2026-07-13 (v0.4.4.x vault_read landed)

- **vault_read Rust command shipped** (commit pending merge) — third Tauri command. With this, Tauri release app can read any entity by id.
- **id format = `{directory}/{slug}`** — kept directory name (not entity type) so the id is self-describing (file path is implied). Type comes from inverting cfg.directories. Filed v0.4.4.x polish: assert resolved path is under vault_root.
- **Frontend rewire: api.read → invokeOrFetch** — 3rd api method using the bridge. Tauri mode: vault_read, browser mode: fetch. Working end-to-end (Tauri-sim test confirms).
- **Pre-existing parallel-test race fixed** — old chdir-based tests failed intermittently under parallel `cargo test`. Converted to SECOND_BRAIN_CONFIG env var pattern.
- **parse_id first attempt was wrong** — hard-coded type check against person/task/project/link, but id is `{dir}/{slug}` not `{type}/{slug}`. Fixed by removing the check from parse_id and doing it via cfg inversion in vault_read.
- **14/14 tests pass** (5 new for vault_read and parse_id, 9 pre-existing still passing).

## 2026-07-13 (v0.4.4.x+ vault_create landed)

- **vault_create Rust command shipped** — 4th Tauri command. With config_get + vault_list_all + vault_read + vault_create, the desktop app has a real read-write loop for the "new entity" path.
- **Self-rolled date math instead of pulling chrono** — added ~60 lines of proleptic Gregorian conversion to avoid a new dep. Filed as polish to swap in chrono when convenient.
- **Portable file lock via `.sb-lock` marker file** — busy-wait + drop on release. OS-level flock has inconsistent semantics across Linux/Windows/BSD. Marker file is universal.
- **Atomic write via `.tmp-{pid}-{slug}` then rename** — standard POSIX-safe pattern. On crash mid-write, the directory has at most a `.tmp-*` file (cleaned by next successful write) and the real file is either old or new, never half-written.
- **Slug collision handling** — append `-2`, `-3`, etc. up to 100 retries. Real-world users hit this when they create multiple "Buy milk" tasks.
- **EnvGuard RAII pattern for env-var tests** — Drop restores the env var even if the test panics. Replaces the panic-prone `let prev = ...; set_var; ...; match prev { restore }` pattern. Also makes the lock acquisition obvious (just `let _lock = ENV_LOCK.lock()...` at the top).
- **Parallel test race on `std::env::set_var` in Rust 1.97** — `set_var` is now `unsafe` because the stdlib doesn't synchronize. A mutex around the test is required; my first attempt had only my new tests using the mutex, and the old `set_var` calls in pre-existing tests were racing with my new tests' env reads. Fixed by adding the mutex to ALL env-var tests.

## 2026-07-13 (v0.4.4.x++ vault_update + vault_delete landed)

- **vault_update Rust command shipped** — read existing frontmatter → merge with new data → atomic write. Patch semantics (unspecified keys preserved), not replace. Always bumps 'updated'. 5th Tauri command.
- **vault_delete with trash support** — 6th Tauri command. trash:false → unlink; trash:true → rename to <vault>/.trash/<slug>-<ts>.md. Default to hard delete (matches Node server's behavior).
- **CRUD complete in Rust** — the Tauri desktop app can now read (config_get, vault_list_all, vault_read), create (vault_create), update (vault_update), delete (vault_delete). All entity operations work without the Node HTTP server.
- **27/27 tests pass in parallel** — added 6 tests for the new commands. ENV_LOCK mutex + EnvGuard RAII pattern continues to keep env-var tests stable.
- **Frontend bridge extended** — api.update and api.delete now invoke-first with fetch fallback. Same pattern as vault_create.
- **Test reliability proven** — 5 consecutive parallel `cargo test` runs all 27/27 pass, zero flakes. The ENV_LOCK mutex + EnvGuard + env-var-aware helpers finally nailed the parallel-test race.

## 2026-07-13 (v0.4.6 Tauri build pipeline landed)

- **Local build works end-to-end** — `cargo tauri build --bundles deb` produces an 11MB release binary and a 3MB .deb package. The Tauri app can now be distributed to Linux users.
- **AppImage blocked on Arch** — `linuxdeploy` upstream has a bug with empty path argument that fails on this sandbox. The .deb path (native `cargo-deb`) works. CI on ubuntu-22.04 should produce AppImage.
- **GitHub Actions workflow added** — `.github/workflows/release.yml` triggers on tag push or manual dispatch. Builds on ubuntu-22.04, uploads artifacts, creates draft release with auto-generated notes. Manual publish step keeps release quality controlled.
- **Identifier fix** — `com.secondbrain.app` → `com.secondbrain.desktop`. The `.app` suffix conflicts with the macOS app bundle extension; `.desktop` is the Linux convention.
- **Build is 2-3 min cold, ~30s warm** — mostly webkit2gtk + GTK. The optimization gap (207MB debug → 11MB release) is the usual Rust codegen + strip-debug-info story.
- **Draft releases, not auto-publish** — matches the project's "every change has Evidence" philosophy. Maintainer reviews the draft before going public.

## 2026-07-13 (v0.4.4.x+++ vault_search landed)

- **vault_search Rust command shipped** — 7th Tauri command. Full-text search across all entities with relevance scoring (exact title > title match > body match).
- **Scoring formula tuned** — title match worth 100, body match worth 10, exact title match worth 500 (big jump to catch "show me X specifically" queries). Position-based bonus within a field (earlier = higher) breaks ties.
- **O(N) walk, no index** — for personal vaults (hundreds of entities) this is fine. Inverted index is filed as polish for 10k+ entity scale.
- **Empty query errors, not empty Vec** — distinguishes "user typed nothing" (error) from "nothing matched" (empty Vec). Better UX for the search bar.
- **No data-field search** — doesn't match against tags, status, priority, due. Filed as polish with field-prefix syntax (`tags:urgent`).
- **No pagination** — returns all matches, lets UI paginate. Filed as polish with top-N + total count.
- **Tauri desktop app is now feature-complete for v0.4 CRUD+search scope** — 7 commands: config_get, vault_list_all, vault_read, vault_create, vault_update, vault_delete, vault_search. Every entity operation available in browser is also available in Tauri mode.

## 2026-07-13 (v0.4.c5 cockpit bottom row landed)

- **Cockpit today page now has 8 panels** — 3 main grid (感悟/成就/关注), 2 right rail (任务与提醒/即将到来), 3 bottom row (捕获的想法/收藏与书签/记忆回顾). The cockpit is starting to feel like a real product surface, not a placeholder.
- **Bookmarks = filter on existing link entities, not a new data model** — `bookmark: true` frontmatter flag is enough. No new entity type, no new CRUD, no new Tauri command. The vault already has link entities; the cockpit just surfaces a subset differently.
- **Captures: forward-compatible empty state** — the panel layout + data hook (`data.captured === true`) is in v0.4.c5. The actual capture flow (⌘N keyboard, mobile share, etc.) lands in v0.5. The empty state tells the user to expect it.
- **Memory recall = 6 most recently updated entities across all types** — type-agnostic, fits in one panel, sorts by `data.updated` desc. Filed polish: real "memory recall" would consider capture-order + read-frequency, not just recency.
- **Cockpit is becoming a "daily use" surface, not a placeholder** — 8 panels is a lot. v0.4.6 should split cockpit.js into modules before it grows further.
