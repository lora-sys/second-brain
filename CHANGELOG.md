# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Drag-and-drop for kanban
- Browser extension for one-click web clipping
- PDF preview
- SQLite FTS5 for full-text search at scale
- Theme system (custom palette + fonts)


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

[Unreleased]: https://github.com/lora-sys/second-brain/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/lora-sys/second-brain/releases/tag/v0.2.0
[0.1.0]: https://github.com/lora-sys/second-brain/releases/tag/v0.1.0
