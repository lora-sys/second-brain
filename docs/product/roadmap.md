# Roadmap

> **Status**: Living doc. Update at end of each phase. Each phase has an exit criterion that must be true before moving on.

---

## Phase 0 — Bootstrap (now → done when ADRs signed off)

**Goal**: Set up the engineering harness on the existing repo.

| # | Issue | Title | Class | Exit |
|---|---|---|---|---|
| #0.1 | harness-bootstrap | Create AGENTS.md, PROJECT_STATUS.md, docs/, memory/, sessions/ | A | ✅ committed |
| #0.2 | vision-prd-roadmap | Write vision.md, prd.md, mvp.md, roadmap.md | A | this doc merged |
| #0.3 | adr-0001-tauri-strategy | ADR: Tauri wraps web frontend (vs rewrites it) | A | accepted by human |
| #0.4 | adr-0002-llm-strategy | ADR: Local-only LLM (vs API) | A | accepted |
| #0.5 | adr-0003-repo-strategy | ADR: Single repo with `src-tauri/` (vs split) | A | accepted |
| #0.6 | adr-0004-data-schema | ADR: SQLite vs JSONL for event log | A | accepted |

**Phase 0 exit**: All 4 ADRs accepted. `PROJECT_STATUS.md` shows 4 ADRs in `Recently Merged` and v0.4 issues in `Now`.

---

## Phase 1 — Tauri shell (v0.4)

**Goal**: The web frontend runs as a native Linux desktop app. Same UX, real OS integration (file system, system tray, native dialogs).

| # | Issue | Title | Class | Owner |
|---|---|---|---|---|
| #1 | v0.4-init | Init Tauri v2 project alongside existing web SPA, keep web as showcase | A | frontend |
| #2 | v0.4-capabilities | Configure Tauri capabilities: vault FS, settings, no shell | A | backend |
| #3 | v0.4-commands | Port Node HTTP endpoints to Tauri commands (vault read/write/list) | A | backend |
| #4 | v0.4-build-pipeline | Build script: `npm run build:tauri` produces Linux AppImage + .deb | A | backend |
| #5 | v0.4-frontend-rewire | Replace `fetch('/api/...')` with `invoke('cmd_name', args)` | F | frontend |
| #6 | v0.4-tray-menu | System tray icon, quit-on-close, open vault in file manager | F | frontend |
| #7 | v0.4-settings-vault | Move vault path from `config.json` to Tauri-managed settings store | A | backend |
| #8 | v0.4-evidence | Run full v0.3 E2E suite against Tauri build, capture screenshots | QA | qa |

**Phase 1 exit**: AppImage runs on a clean Linux machine with `xdg-open ./second-brain_0.4.0_amd64.AppImage`. Existing v0.3 features (CRUD, kanban DnD, wikilink, smart mentions, tag filter, themes) all pass E2E.

---

## Phase 2 — Event stream + Daily Memory (v0.5)

**Goal**: The app watches the vault and the user's actions, then generates a daily reflection.

| # | Issue | Title | Class | Owner |
|---|---|---|---|---|
| #9 | v0.5-event-store | Event store: append-only JSONL, one line per event | A | backend |
| #10 | v0.5-fs-watcher | Watch vault for file changes, emit `file.changed` events | A | backend |
| #11 | v0.5-app-events | Emit `task.completed`, `link.imported`, etc. from app | A | backend |
| #12 | v0.5-sqlite-migration | SQLite + FTS5 schema, vault-side migration runner | DB | database |
| #13 | v0.5-llm-adapter | LLM adapter trait, Ollama + llama.cpp + (later) Anthropic impls | A | agent |
| #14 | v0.5-daily-agent | Daily reflection agent: events → structured reflection | AI | agent |
| #15 | v0.5-journal-write | Write generated daily to `00-Daily/YYYY-MM-DD.md` in vault | A | backend |
| #16 | v0.5-prompts-audit | Every prompt template stored in vault under `/00-AI/prompts/` | A | agent |
| #17 | v0.5-evidence | E2E: open app, do 3 things, run daily, verify output | QA | qa |

**Phase 2 exit**: After 3 days of normal use, a daily journal appears in the vault that *actually* reflects what the user did (not generic prose).

---

## Phase 3 — Knowledge Graph (v0.6)

**Goal**: Make the implicit relations between entities explicit and queryable.

| # | Issue | Title | Class | Owner |
|---|---|---|---|---|
| #18 | v0.6-graph-store | Relation store: `subject` → `predicate` → `object` triples | A | backend |
| #19 | v0.6-infer-relations | Mine wikilinks + co-occurrence + tag overlap to suggest relations | A | agent |
| #20 | v0.6-backlinks-panel | "Mentioned in" panel on every detail page | F | frontend |
| #21 | v0.6-semantic-search | Vector + FTS5 hybrid search across all entities | AI | agent |
| #22 | v0.6-graph-view | Canvas-based force-directed graph of related entities | F | frontend |
| #23 | v0.6-evidence | Find someone → see everything about them across all entity types | QA | qa |

**Phase 3 exit**: From a person, see every task, project, link, and meeting note that touches them, ranked by recency and importance.

---

## Phase 4 — Reflection + Decision (v0.7–v0.8)

| # | Issue | Title | Class | Owner |
|---|---|---|---|---|
| #24 | v0.7-reflection-agent | Weekly pattern detection: "you've been blocked on X for N days" | AI | agent |
| #25 | v0.7-prompt-store | Reflection prompts live in vault, version-controlled | A | agent |
| #26 | v0.8-decision-schema | Decision Journal schema: context, options, decision, retrospect | A | backend |
| #27 | v0.8-decision-ui | Decision entry form + retrospective view | F | frontend |
| #28 | v0.8-decision-stats | Success-rate analysis of past decisions | AI | agent |
| #29 | v0.8-evidence | After 5 decisions, ask for retrospective, verify it adds value | QA | qa |

**Phase 4 exit**: User makes a decision, logs it; 3 months later, the system reminds them to retro it.

---

## Phase 5 — Personal Agent (v0.9+)

| # | Issue | Title | Class | Owner |
|---|---|---|---|---|
| #30 | v0.9-skill-distillation | Observe user's patterns, generate `lora-*.skill.md` files | AI | agent |
| #31 | v0.9-agent-runtime | Embedded agent runtime with tool-use, file RAG, structured prompts | AI | agent |
| #32 | v0.9-skill-loader | Load skills into agent context, weighted by relevance | AI | agent |
| #33 | v0.10-skill-versioning | Track skill versions, support rollbacks | A | backend |
| #34 | v0.10-skill-sharing | Optional: export a skill bundle for friends to try | F | frontend |

**Phase 5 exit**: User says "what should I do next?" and gets an answer that uses their own patterns, not generic ChatGPT advice.

---

## V0.4 Detail (current focus)

This is what we're building *next*. Issue breakdown:

### v0.4.1 — Init Tauri
- Tauri v2 project at `/home/lora/second-brain/src-tauri/`
- `tauri.conf.json` with product name, identifier, build commands
- `Cargo.toml` with minimum deps: `tauri = "2"`, `serde`, `serde_json`, `tokio`
- Dev script: `npm run tauri:dev` runs the web build + Tauri shell

### v0.4.2 — Capabilities
- `tauri::Builder::default().setup(...).invoke_handler(...)` with whitelisted commands
- Commands: `vault_list`, `vault_read`, `vault_write`, `vault_delete`, `config_get`, `config_set`
- No shell, no `tauri-plugin-shell`, no arbitrary command execution

### v0.4.3 — Port endpoints
- Each existing `/api/*` endpoint becomes a Tauri command
- Frontend: replace `fetch('/api/...')` with `window.__TAURI__.invoke('cmd_name', args)`
- Keep the Node HTTP server optional for users who want web showcase

### v0.4.4 — Build pipeline
- GitHub Actions: on tag, build AppImage + .deb for x86_64
- Upload to release

**Phase 1 evidence**:
- AppImage screenshot showing the v0.3 web frontend running in a Tauri window
- Playwright test that runs the Tauri build's binary and verifies UI interactions
- Build log proving successful bundle
