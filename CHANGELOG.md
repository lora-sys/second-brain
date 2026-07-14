# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Drag-and-drop for kanban
- Browser extension for one-click web clipping
- PDF preview
- Theme system (custom palette + fonts)
- v0.4.5.x: auto-restart after settings change
- v0.4.5.x: inline directory editing (advanced)
- v0.4.6a-e: perf debt (no-innerHTML, virtualize lists, skeleton states, async FS, debounce wikilink)
- v0.4.L2.x: custom domain + Schema.org + auto-update landing stats
- v0.6.x: canvas graph minimap, fit-to-view, edge text labels
- v0.7: reflection agent, decision journal

## [0.9.0] - 2026-07-14

### Added
- **Skills** (v0.9) — Personal Agent now has reusable instruction sets stored as markdown files in `vault/00-AI/skills/{slug}.md`.
- Frontmatter: name / description / tags. Body: free-form markdown instructions.
- 4 new endpoints: `GET /api/skills`, `GET /api/skills/:slug`, `POST /api/skills`, `DELETE /api/skills/:slug`.
- Cockpit agent UI: skill chip bar above the conversation. Click → modal with body.
- Quick prompt: "保存当前对话为 skill" — opens save modal pre-filled with the last assistant response.
- Inline "↻ 存为 skill" button on each assistant response.
- **Skill loader (v0.9.x)** — agent auto-queries `GET /api/skills?q=<prompt>` to find matching skills (keyword overlap on name/description/tags), and injects them into the default-branch response. Response meta shows "N skill(s) 注入".
- **Skills management page (v0.9.x)** — new cockpit sidebar section. Browse, create, edit, and delete skills. Tag chip bar shows top 6 tags by usage. Status cards: 总数 / 标签.

### Test coverage
- 78 E2E tests pass (was 72 before v0.9)
- 49 Rust unit tests pass 5/5

## [0.8.0] - 2026-07-14

### Added
- **Decision Journal** (v0.8) — new entity type `decision` with full schema (context, options, decision, status, retrospective, outcome, madeAt, tags).
- New cockpit section: 决策 — 4 status cards (总数 / 待回顾 / 已回顾 / 需回顾 30+ 天) + sorted list with age badges.
- Retrospective modal: 添加回顾 button on each pending/old decision.
- Pending decisions older than 30 days show a ⏰ "需要回顾" warning.
- New directory: `50-Decisions/`. Default mapping in `config.json`.

### Test coverage
- 72 E2E tests pass (was 64 before v0.8)
- 49 Rust unit tests pass 5/5

## [0.7.0] - 2026-07-14

### Added
- **Weekly reflection** (v0.7) — new 周报 cockpit section. Scans 7 days of events + stale tasks, writes to `00-Weekly/YYYY-MM-DD.md`.
- 6 sections per weekly: 本周焦点 / 完成的事 / 进展中的事 / 被忽略的信号 / 陈旧任务 / 下周看什么.
- Stale task detection — finds open tasks not updated in 7+ days.
- New endpoints: `GET /api/weekly`, `POST /api/weekly`, `GET /api/weekly/:date`.

### Test coverage
- 64 E2E tests pass (was 56 before v0.7)
- 49 Rust unit tests pass 5/5

## [0.6.0] - 2026-07-14

### Added
- **v0.6 — Knowledge Graph v2** (Phase 3 of roadmap)
  - **Backlinks panel** on every entity detail page (引用了 / 被引用 two-column layout)
  - Resolution matches id, type/slug, slug, or title — handles all wikilink styles
  - 30s cached bodies via `_fullEntitiesCache`
  - **Weighted search** (v0.6.3) — title=100/30, tag=25/10, body=5/match, recency boost +0-10
  - **Canvas force-directed graph view** (v0.6.4) — toggle in 知识图谱. Pure vanilla JS, no deps.
  - **Canvas zoom + pan** (v0.6.5) — mouse wheel + click-drag. Edge highlight markers on hover.
- **v0.6.1 — Daily timeline auto-refresh** after generation
- **v0.6.2 — Agent conversation persistence** in localStorage (`sb-agent-history-v1`)

### Improved
- Knowledge graph view now has tabbed UI: 列表 (hubs) / 关系图 (canvas)
- Search results show score badges + total count

### Test coverage
- 56 E2E tests pass (was 52 before v0.6 rounds)
- 49 Rust unit tests pass 5/5 (unchanged)
- Standard v3 mode + cockpit mode regression passes

## [0.5.0] - 2026-07-14

### Added
- **Event store (v0.5.1)** — JSONL append-only log under `vaultRoot/.events/YYYY-MM-DD.jsonl`. All CRUD handlers emit events (`task.created`/`task.updated`/`task.deleted`/`task.done`/`task.in_progress`/etc., `person.*`, `project.*`, `link.imported`, `daily.generated`, `file.changed`). Status transitions (todo→done) get specific event types.
- **File system watcher (v0.5.1)** — `fs.watch` based. Detects external changes (Obsidian edits, manual file ops, git pulls) and emits `file.changed` events. Cross-platform (recursive on mac/Windows, per-dir fallback on Linux). 250ms debounce.
- **Daily journal generator (v0.5.x)** — `lib/daily.mjs` summarises events, sends to LLM provider, writes `00-Daily/YYYY-MM-DD.md` to vault. Atomic write. Frontmatter includes provider name + model.
- **LLM provider wiring (v0.5.x)** — proper OpenAI-compatible provider (`lib/llm/openai.mjs`). Works with OpenAI, Ollama (`/v1`), LM Studio. Reads `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` from env. Falls back to `LocalEchoProvider` when no API key set.
- **Cockpit 日记 section** — new sidebar item. Status cards (provider / events today / journals total) + generate button + 7-day timeline + viewer.
- **Daily timeline (v0.5.4)** — 7-day grid showing which days have generated journals. Today/yesterday/N天前 labels + accent highlight on has-journal days.

### Improved
- OpenAI provider stub (was throwing "not yet implemented") replaced with real implementation.
- Local-echo daily fallback produces structured markdown from event types.
- File paths in daily journal `## 文件变化` section make external edits visible.

### API endpoints
- `GET /api/events?days=N` — list recent events
- `GET /api/daily` — list recent journals
- `POST /api/daily { days, date }` — generate today's journal
- `GET /api/daily/YYYY-MM-DD` — read a specific journal

### v0.5.5 — Agent tool-use
- Local-echo agent can now perform actions (create_task, mark_done) alongside text responses.
- Action results shown inline as green ✓ rows.
- 2 new quick prompts: '新建任务: ...' + '把最新任务标完成'.

### v0.6 — Knowledge Graph enhancements
- **Backlinks panel** on every entity detail page (引用了 / 被引用 two-column layout).
- Resolution matches id, type/slug, slug, or title — handles all wikilink styles.
- 30s cached bodies via `_fullEntitiesCache` for backlink computation.

### v0.6.1 — Daily timeline auto-refresh
- After '生成今天的日记' click, page re-navigates so today's cell shows ✓ 已生成 badge immediately.

### v0.6.2 — Agent conversation persistence
- localStorage key `sb-agent-history-v1`. Conversation survives reloads.
- '清空历史' button (visible only when history exists).

### Test coverage
- 52 E2E tests pass (was 41 before v0.5.0; +11 across v0.5 + v0.6 rounds)
- 49 Rust unit tests pass 5/5 (unchanged)
- Standard v3 mode + cockpit mode regression passes
- Milestone test: `cockpit: NO soon badges remain anywhere in sidebar`

## [0.4.0] - 2026-07-13

### Added
- **Tauri 2.0 desktop shell** — `src-tauri/` wraps the existing web frontend as a Linux desktop app (AppImage + .deb). 10 Tauri commands port the Node HTTP endpoints to Rust: `config_get`, `config_set`, `vault_list_all`, `vault_list_by_type`, `vault_read`, `vault_create`, `vault_update`, `vault_delete`, `vault_search`, `vault_link_import`. Bridge pattern (`invoke`/`fetch`) means the same code runs in browser and in the Tauri shell.
- **Cockpit Today Page** (`?cockpit=1`) — multi-pane shell with sidebar nav. 12 sections: 今日 / 笔记库 / 任务 / 日程 / 回顾 / 资源库 / 标签 / 设置 + 3 placeholders (知识图谱 / 模板 / 智能体). Sections: today panel (感悟 / 成就 / 关注), right rail (任务与提醒 / 即将到来), bottom row (捕获的想法 / 收藏与书签 / 记忆回顾), notes (grouped by type), tags (cloud + click-to-filter), review (7-day recap), knowledge graph (wikilinks + tag overlap).
- **Settings page** — vault path / port / host editor. Browser mode uses `PUT /api/config`; Tauri mode uses `config_set` invoke. Read-only directory display.
- **Knowledge graph view** — top hubs ranked by degree, type distribution cards, edges with reason labels (`wikilink` or `#tag`).
- **Landing page** (`docs/index.html`) — public face for the project. 6 features, 4 architecture pillars, 3 install steps. Auto-deployed to GitHub Pages with OpenGraph + custom 404.
- **Real-device E2E tests** — `tests/e2e/real-device.mjs` (23 tests) covers standard mode + all 10 working cockpit sections + API contracts. Tests write results to `window.__testTally` for `playwright-cli` introspection.
- **2 critical bug fixes** found by real-device E2E:
  - cockpit's `renderContent` was wiping the adopted `<main id="main">` by setting `innerHTML` on `#cockpit-content`. Fix: `renderTarget()` prefers `#main` over `#cockpit-content`.
  - `回顾` nav entry had `impl: 'soon'` despite being implemented in v0.4.c6.回顾. Fix: `impl: 'review'`.

### Improved
- `app.js` split into 4 modules (bridge, state, icons, api). Smaller, more focused files.
- VaultRepo abstraction in Rust — `vault_list_by_type` is now type-aware.

### Security
- Tauri 2.0 capabilities minimal — no shell plugin, no arbitrary command execution. The only commands available are our 10 vault commands.
- WebKit + Wayland compatibility — works on X11 fallback when Wayland compositor fails.

### Build & Release
- GitHub Actions: `release.yml` builds .deb + .AppImage + .rpm on tag push and creates a draft GitHub release with auto-generated notes.
- GitHub Pages: `pages.yml` builds and deploys the landing page on every push to main.
- Concurrency groups on both workflows prevent race conditions on rapid pushes.
- Concurrency: withFileLock + withLockedMutation in vault.mjs (carried over from v0.4.1).

### Verification
- 49 Rust unit tests pass 5/5 (vault, frontmatter parser, wikilink extraction, link_import, VaultRepo)
- 23 E2E tests pass (10 cockpit sections + 5 knowledge graph + 3 API + 5 navigation regression)
- .deb package verified: 11MB binary + icons + .desktop file, deps on libwebkit2gtk-4.1-0 + libgtk-3-0
- Browser console clean (0 errors) in both standard v3 mode and cockpit mode

## [0.3.0] - 2026-07-12

### Added
- **Wikilink autocomplete** (v0.3 主菜) — 编辑器里输入 `[[` 触发浮层，模糊搜索所有实体（按 label / slug / type 匹配），方向键选择，回车或 Tab 插入 `[[type/slug|label]]`，Esc 关闭。打开编辑 modal 时自动预加载所有实体。
- **Smart mentions** (v0.3 配菜) — 渲染 Markdown 时自动把认识的人名/标题转成 `.auto-mention` wikilink（虚线下划线区分于显式 wikilink 的实色胶囊）。词边界检测避免误匹配。
- **任务卡片 inline 状态切换** (v0.3 小菜) — 看板卡片 hover 状态徽章变成可点击，点击弹 popover 选择 4 种状态，乐观更新 + API 同步 + 失败回滚。
- **标签筛选 chips** (v0.3 甜点) — 列表页（人物/项目/链接）顶部 tag chip 多选，AND 逻辑，"清除"按钮一键还原。状态持久化在内存中。

### Improved
- 渲染 markdown 时多走一遍 `applySmartMentions` post-process（DOM walker，安全避开 `<a>/<code>/<pre>` 内部）
- renderEntity 加载时也预加载 allEntities，确保详情页有 smart mention 数据

## [0.2.0] - 2026-07-11


### Added
- **Design upgrade (v0.2 design language)**
  - Type-color identity: orange / sky / violet / emerald for person / task / project / link
  - Display font (Fraunces serif) for titles, Inter for UI, JetBrains Mono for code
  - New brand mark: 4-quadrant colored square representing the entity types
  - Dashboard rewritten: hero, 2-column layout (main + sidebar widgets), tag cloud, task-progress stacked bar
  - Cards: type-color accent strip + hover lift with shadow
  - Program-generated avatars with hash-based gradients (12 distinct palettes)
  - Detail page: type-color accent band, large avatar for people
  - Empty states: SVG illustrations + friendly copy
  - Modal: type-color top stripe, prefix labels
  - Toast: type-colored left stripe
  - Three themes: Light / Dark / Sepia (toggle cycles through)
- **Command palette (⌘K / Ctrl+K)** — fuzzy search across entities + commands (新建人物 / 任务 / 项目 / 导入链接 / 切换主题 / 打开设置)
- **Drag-and-drop kanban** — drag a task card across columns to change status, with optimistic UI + API sync + rollback on error
- **Inline column add** — `+ 添加任务` button at the bottom of each kanban column
- **Search keyboard nav** — ↑/↓ to navigate, Enter to jump, Esc to close
- **Theme toast feedback** — shows current theme on toggle
- **Defensive uncaughtException handler** in server so a bad request doesn't kill the process

### Improved
- Frontmatter parser was already lenient; kept as-is.
- Sidebar with cleaner sectioning (导航 / 系统) + active-state color
- Topbar with ⌘K hint chip + theme toggle

## [0.1.0] - 2026-07-11


### Added
- 人物 (People) module — CRUD with contact info, social handles, tags, status
- 任务 (Tasks) module — Kanban board with 4 statuses (todo / in_progress / done / cancelled), priority, due date
- 项目 (Projects) module — Aggregates people / tasks / links, with start date and status
- 链接 (Links) module — Import URL with light fetch (metadata) or deep fetch (full article → Markdown)
- Markdown body rendering with `[[wikilink]]` support — clickable cross-references between entities
- Bidirectional Obsidian sync — web and Obsidian edit the same Markdown files
- Hash-based SPA routing
- Full-text search across all entity types
- Light/dark theme toggle (persisted in localStorage)
- Responsive layout — desktop / tablet / mobile breakpoints
- REST API at `/api/*` (entities CRUD, search, dashboard summary, link import, health, config)
- Lenient YAML frontmatter parser — handles user-edited files with markdown leaking into the YAML block
- Auto-generated slug from title; collision avoidance via numeric suffix
- Atomic file writes (write to temp + rename)
- Demo video and screenshots in `docs/`
- E2E test script using Playwright CLI screencast (`recordings/e2e-demo.mjs`)

### Security
- Localhost-only binding (127.0.0.1) by default
- No external network calls beyond user-initiated link imports

### Known limitations
- No drag-and-drop for kanban (use Edit modal to change status)
- No PDF / Office preview
- Search is substring matching (not full-text / fuzzy)
- No reminders, recurring tasks, or task dependencies
- Link import requires server-side fetch (network access)
- All multi-user concerns out of scope (single user only)

[Unreleased]: https://github.com/lora-sys/second-brain/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/lora-sys/second-brain/releases/tag/v0.3.0
[0.2.0]: https://github.com/lora-sys/second-brain/releases/tag/v0.2.0
[0.1.0]: https://github.com/lora-sys/second-brain/releases/tag/v0.1.0
