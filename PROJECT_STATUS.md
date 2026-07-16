# PROJECT_STATUS.md

_Last updated: 2026-07-12 by @coordinator_

> This is the live kanban. Update at every Issue transition.

## Phase

- **Phase 0 — Bootstrap** — ✅ **Done** (6 ADRs, harness structure, memory seed)
- **Phase 1 — v0.4 (Tauri + Cockpit + Landing)** — 🔄 **In progress**
- **Phase 2 — v0.5 (Event stream + Daily Journal)** — Planned
- **Phase 3 — v0.6 (Knowledge Graph + Semantic Search)** — Planned
- **Phase 4 — v0.7-v0.8 (Reflection + Decision Journal)** — Planned
- **Phase 5 — v0.9+ (Personal Agent + Skills)** — Planned

## Now (in progress)

| Issue | Title | Track | Owner | Branch | Status |
|---|---|---|---|---|---|
| #v0.4.1 | Monorepo bootstrap: extract `lib/` → flat lib/ at root | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.c1 | Cockpit skeleton (sidebar + multi-pane shell) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.3 | Tauri 2.0 init in `src-tauri/`, config, capabilities | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4 | config_get + vault_list_all Rust Tauri commands | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x | vault_read + frontend rewire | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x+ | vault_create | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x++ | vault_update + vault_delete | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x+++ | vault_search | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x++++ | config_set | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x+++++ | VaultRepo refactor + vault_list_by_type | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.4.x++++++ | links_import / VaultOps trait / Settings UI | Tauri | @coordinator | (follow-up) | Backlog |
| #v0.4.5 | Frontend rewire (config_get + vault_list_all → invoke) | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.6 | Tauri build pipeline + .deb + GitHub Actions | Tauri | @coordinator | merged | ✅ Done |
| #v0.4.6 | app.js module split (bridge/state/icons/api) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.6.x | AppImage on Arch / further split / DOM building / virtualization | Tauri | @coordinator | (follow-up) | Backlog |
| #v0.4.c3 | Cockpit today panel (感悟/成就/关注) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.c4 | Cockpit right rail (任务与提醒 + 即将到来) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.c5 | Cockpit bottom row (捕获/收藏/记忆回顾) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.c6.schedule | Cockpit 日程 section (timeline) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.c6.知识图谱 | Cockpit 知识图谱 section (wikilinks + tag overlap) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.c6.模板 | Cockpit 模板 section (12 starter templates) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.c6.智能体 | Cockpit 智能体 section (local-echo agent) | Cockpit UI | @coordinator | merged | ✅ Done |
| #v0.4.7 | Real-device E2E tests + 2 critical bug fixes | Test | @coordinator | merged | ✅ Done |
| #v0.4.L1 | Landing page (Track 4) | Web | @coordinator | merged | ✅ Done |
| #v0.4.L2 | GitHub Pages deploy + OpenGraph + custom domain | Web | @coordinator | (follow-up) | Backlog |

## Backlog (v0.4, in dependency order)

### Track 1 — Tauri shell

| # | Issue | Title | Estimate | Class |
|---|---|---|---|---|
| v0.4.1 | monorepo-bootstrap | Extract `lib/` → flat lib/ at root | M | A | ✅ |
| v0.4.3 | desktop-init | Tauri 2.0 init in `src-tauri/`, config, capabilities | M | A |
| v0.4.4 | tauri-commands | Port Node HTTP endpoints to Rust Tauri commands | L | A |
| v0.4.5 | tauri-rewire-frontend | Replace `fetch('/api/...')` with `invoke('cmd_name')` | M | F |
| v0.4.6 | tauri-build-pipeline | AppImage + .deb build, GitHub Actions, release pipeline | M | A |
| v0.4.7 | tauri-evidence | Real-device E2E tests + 2 critical bug fixes (renderContent wipes adopted <main>; 回顾 soon badge) | M | QA | ✅
| v0.4.7.x | tauri-evidence-on-hw | Run Tauri build against real desktop hardware (sandbox GPU limits) | M | QA |
| v0.4.7.y | tauri-mobile-e2e | Mobile viewport E2E tests | S | QA |
| v0.4.7.z | tauri-interaction-e2e | Interaction tests (click → navigate, form submit → API) | M | QA |
| v0.4.5.1 | cockpit-a11y | Keyboard-navigable nav (follow-up from v0.4.c1 review) | S | F |
| v0.4.5.2 | boot-shared-init | Extract setupX calls shared by boot() and __bootCockpit() | S | R |
| v0.4.5.3 | cockpit-mobile-pass | <720px layout polish (follow-up from v0.4.c1 review) | S | F |

### Track 2 — Cockpit UI

| # | Issue | Title | Estimate | Class |
|---|---|---|---|---|
| v0.4.c1 | cockpit-skeleton | Sidebar layout, content panels, dark theme default | L | F | ✅ |
| v0.4.c3 | cockpit-today-panel | Today panel: 每日日志 with 今日感悟 / 今日成就 / 今日关注 | L | F |
| v0.4.c4 | cockpit-tasks-rail | Right rail: 任务与提醒 + 即将到来 | M | F |
| v0.4.c5 | cockpit-captures | Bottom row: 捕获的想法 + 收藏与书签 + 记忆回顾 | M | F |
| v0.4.c6 | cockpit-views-impl | 实现每个 sidebar section | XL | F |
| v0.4.c7 | cockpit-evidence | E2E: 所有 sidebar 跳转、面板切换、状态保持 | M | QA |
| v0.4.c8 | cockpit-tags-mgmt | 标签 full management (merge / filter / saved views) | M | F |

### Track 3 — Performance (v0.4.6 perf debt)

| # | Issue | Title | Estimate | Class |
|---|---|---|---|---|
| v0.4.6a | perf-no-innerhtml | 替换全 `innerHTML =` 为小 diff 或虚拟 diff | M | R |
| v0.4.6b | perf-virtualize-list | 长列表虚拟化（>200 items 不卡） | M | R |
| v0.4.6c | perf-skeleton | Skeleton states 替代 spinner | S | R |
| v0.4.6d | perf-async-fs | 异步文件 I/O | S | R |
| v0.4.6e | perf-debounce-wikilink | Wikilink 搜索 debounce + 缓存 | S | R |

### Track 4 — Web Landing Page

| # | Issue | Title | Estimate | Class |
|---|---|---|---|---|
| v0.4.L1 | landing-skeleton | Single `index.html` in `packages/web-landing/` (TBD), Image 1 视觉风格 | M | F |
| v0.4.L2 | landing-deploy | Static deploy (GitHub Pages) + redirect to download | S | A |

## Blocked

_None._

## Recently Merged

| PR | Title | Evidence |
|---|---|---|
| `1a3cc0c` | chore(release): v0.5.0-alpha (event stream + daily memory) | [docs/evidence/v0.5.4-daily-timeline/](evidence/v0.5.4-daily-timeline/) |
| `(pending)` | feat(security): v0.17 — sanitize markdown output (XSS hardening) | [docs/evidence/v0.17-sanitize-markdown/](evidence/v0.17-sanitize-markdown/) |
| `(pending)` | refactor(cockpit): v0.16 — extract Recent Activity to standalone component | [docs/evidence/v0.16-activity-component/](evidence/v0.16-activity-component/) |
| `57c2ba6` | merge: feature/v0.5.4-daily-timeline (7-day daily timeline) | [docs/evidence/v0.5.4-daily-timeline/](evidence/v0.5.4-daily-timeline/) |
| `8dbf510` | merge: feature/v0.5.1-fs-watcher (FS watcher for external vault changes) | [docs/evidence/v0.5.1-fs-watcher/](evidence/v0.5.1-fs-watcher/) |
| `a250637` | merge: feature/v0.5-event-stream (event stream + daily journal) | [docs/evidence/v0.5-event-stream/](evidence/v0.5-event-stream/) |
| `d340e5f` | merge: feature/v0.4.c6-agent (智能体 — last cockpit placeholder) | [docs/evidence/v0.4.c6-agent/](evidence/v0.4.c6-agent/) |
| `3d6d660` | merge: feature/v0.4.c6-templates (templates section) | [docs/evidence/v0.4.c6-templates/](evidence/v0.4.c6-templates/) |
| `259e396` | merge: feature/v0.4.c6-knowledge-graph (knowledge graph view) | [docs/evidence/v0.4.c6-knowledge/](evidence/v0.4.c6-knowledge/) |
| `c148568` | merge: feature/v0.4.7-real-device-e2e (real-device E2E + 2 bug fixes) | [docs/evidence/v0.4.7-real-device/](evidence/v0.4.7-real-device/) |
| `538b6d4` | docs: memory updates for v0.4.c3 | (in v0.4.c3 evidence) |
| `4cf242a` | docs: memory updates for v0.4.5 | (in v0.4.5 evidence) |
| (pending) | feat(bridge): v0.4.5 frontend rewire | [docs/evidence/v0.4.5/](evidence/v0.4.5/) |
| `3611244` | feat(tauri): v0.4.4 vault commands (config_get + vault_list_all) | [docs/evidence/v0.4.4/](evidence/v0.4.4/) |
| `84b16cb` | feat(tauri): v0.4.3 init — Tauri 2.0 desktop shell scaffolding | [docs/evidence/v0.4.3/](evidence/v0.4.3/) |
| `ab79c3b` | feat(cockpit): v0.4.c1 cockpit skeleton (sidebar + multi-pane shell) | [docs/evidence/v0.4.c1/](evidence/v0.4.c1/) |
| `04035c9` | fix(cockpit): refresh vault name after async config load | (in v0.4.c1 review) |
| `0a41f9d` | docs(evidence): v0.4.c1 self-review | docs/evidence/v0.4.c1/review-report.md |
| `43f4183` | revert(v0.4.1): restore flat lib/ structure, defer monorepo to v0.5+ | (ADR-0007 pending) |
| (v0.3) | v0.3.0 — Wikilink autocomplete + smart mentions + status popover + tag filter | docs/screenshots/ |
| (v0.2) | v0.2.0 — design + UX overhaul | docs/ |
| (v0.1) | v0.1.0 — initial public release | docs/ |

## Open Reviewer Threads

_None. v0.4.c1 review approved (see review-report.md)._

## Critical Decisions (6 ADRs accepted, 1 pending)

### Accepted
1. ✅ **ADR-0001** Tauri wraps existing web frontend as-is (no rewrite)
2. ✅ **ADR-0002** OpenAI-compatible adapter first, with local-echo fallback
3. ⏸ **ADR-0003** Monorepo workspace (Status: **Superseded by ADR-0007** — flat lib/ at root for v0.4)
4. ✅ **ADR-0004** JSONL (human) + SQLite FTS5 (machine) dual storage
5. ✅ **ADR-0005** v0.4 ships Tauri + Cockpit + Landing (revised: cockpit included)
6. ✅ **ADR-0006** MCP server for external AI integration (Claude/Codex/Hermes)

### Pending
- **ADR-0007** Flat lib/ at root, monorepo deferred to v0.5+ (committed in 43f4183, ADR doc TBD)
- **Capture layer priority** — file watcher / HTTP webhook / CLI binary — all three? Order? (decided in v0.5)
