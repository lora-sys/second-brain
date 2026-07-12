# PROJECT_STATUS.md

_Last updated: 2026-07-12 by @coordinator_

> This is the live kanban. Update at every Issue transition.

## Phase

- **Phase 0 — Bootstrap** — ✅ **Done** (6 ADRs, harness structure, memory seed)
- **Phase 1 — v0.4 (Tauri + Cockpit + Landing)** — 🔄 **In progress** (Tauri track first)
- **Phase 2 — v0.5 (Event stream + Daily Journal)** — Planned
- **Phase 3 — v0.6 (Knowledge Graph + Semantic Search)** — Planned
- **Phase 4 — v0.7-v0.8 (Reflection + Decision Journal)** — Planned
- **Phase 5 — v0.9+ (Personal Agent + Skills)** — Planned

## Now (in progress)

| Issue | Title | Track | Owner | Branch | Status |
|---|---|---|---|---|---|
| #v0.4.1 | Monorepo bootstrap: extract `lib/` → `packages/core/` | Tauri | @coordinator | `refactor/v0.4-monorepo` | Starting |
| #v0.4.2 | Move `public/` → `packages/web/`, add pnpm workspace | Tauri | @coordinator | depends on #v0.4.1 | Blocked |

## Backlog (v0.4, in dependency order)

### Track 1 — Tauri shell

| # | Issue | Title | Estimate | Class |
|---|---|---|---|---|
| v0.4.1 | monorepo-bootstrap | Extract `lib/` → `packages/core/`, set up pnpm workspace | M | A |
| v0.4.2 | web-package | Move `public/` → `packages/web/`, update imports, keep Node server optional | M | A |
| v0.4.3 | desktop-init | Tauri 2.0 init in `packages/desktop/`, config, capabilities | M | A |
| v0.4.4 | tauri-commands | Port Node HTTP endpoints to Rust Tauri commands | L | A |
| v0.4.5 | tauri-rewire-frontend | Replace `fetch('/api/...')` with `invoke('cmd_name')` | M | F |
| v0.4.6 | tauri-build-pipeline | AppImage + .deb build, GitHub Actions, release pipeline | M | A |
| v0.4.7 | tauri-evidence | Run full v0.3 E2E against Tauri build, capture screenshots | M | QA |

### Track 2 — Cockpit UI

| # | Issue | Title | Estimate | Class |
|---|---|---|---|---|
| v0.4.c1 | cockpit-skeleton | Sidebar layout, content panels, dark theme default | L | F |
| v0.4.c2 | cockpit-sidebar | Sidebar nav with all 10 sections (今日 / 笔记库 / 知识图谱 / 任务 / 日程 / 回顾 / 资源库 / 模板 / 标签 / 智能体) | M | F |
| v0.4.c3 | cockpit-today-panel | Today panel: 每日日志 with 今日感悟 / 今日成就 / 今日关注 | L | F |
| v0.4.c4 | cockpit-tasks-rail | Right rail: 任务与提醒 + 即将到来 | M | F |
| v0.4.c5 | cockpit-captures | Bottom row: 捕获的想法 + 收藏与书签 + 记忆回顾 | M | F |
| v0.4.c6 | cockpit-views-impl | 实现每个 sidebar section (笔记库 / 知识图谱 / 任务 / 日程 / 回顾 / 资源库 / 模板 / 标签 / 智能体) | XL | F |
| v0.4.c7 | cockpit-evidence | E2E: 所有 sidebar 跳转、面板切换、状态保持 | M | QA |

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
| v0.4.L1 | landing-skeleton | Single `index.html` in `packages/web-landing/`, Image 1 视觉风格 | M | F |
| v0.4.L2 | landing-deploy | Static deploy (GitHub Pages) + redirect to download | S | A |

## Blocked

_None._

## Recently Merged

| PR | Title | Evidence |
|---|---|---|
| #N/A | v0.3.0 — Wikilink autocomplete + smart mentions + status popover + tag filter | [docs/screenshots/](../../screenshots/) |
| #N/A | v0.2.0 — design + UX overhaul | docs/ |
| #N/A | v0.1.0 — initial public release | docs/ |
| a5d9508 | chore: bootstrap ai-engineering-harness structure | — |
| 7793c48 | docs: finalize 4 ADRs + add 2 new (UI strategy, agent protocol) | — |

## Open Reviewer Threads

_None._

## Critical Decisions (4 ADRs accepted, 2 pending)

### Accepted
1. ✅ **ADR-0001** Tauri wraps existing web frontend as-is (no rewrite)
2. ✅ **ADR-0002** OpenAI-compatible adapter first, with local-echo fallback
3. ✅ **ADR-0003** Monorepo workspace: `packages/{core, web, desktop, agent}`
4. ✅ **ADR-0004** JSONL (human) + SQLite FTS5 (machine) dual storage
5. ✅ **ADR-0005** v0.4 ships Tauri + Cockpit + Landing (revised: cockpit included)
6. ✅ **ADR-0006** MCP server for external AI integration (Claude/Codex/Hermes)

### Pending
- **Capture layer priority** — file watcher / HTTP webhook / CLI binary — all three? Order? (will be decided in v0.5)
