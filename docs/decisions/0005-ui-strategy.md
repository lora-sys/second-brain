# ADR-0005: UI strategy — v0.4 ships Tauri + cockpit rebuild in parallel

- **Status**: Accepted
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.4 (TBD)

## Context

The user shared two design directions:

1. **"Second Brain OS" landing page** (Image 1): marketing-style hero, dark, premium, "OS" product feel
2. **"Productive Cockpit" daily dashboard** (Image 2 & 3): full app UI with left sidebar (今日 / 笔记库 / 知识图谱 / 任务 / 日程 / 回顾 / 资源库 / 模板 / 标签 / 智能体), main column (今日 + 每日日志), right column (任务与提醒), bottom row (捕获的想法 / 收藏与书签 / 记忆回顾)

The user's decision: **v0.4 ships the cockpit UI in parallel with the Tauri migration**. The "稳扎稳打" path of shipping v0.3 UI as-is is rejected — they want the new UI from day one.

## Decision

### v0.4 — Tauri + Cockpit UI in one release

Two parallel tracks, each with its own Worktree:

**Track 1: Tauri shell** (the proven path)
- Init Tauri 2.0 in `packages/desktop/`
- Wrap `packages/web/dist`
- Configure capabilities (FS, settings, no shell)
- Port `/api/*` endpoints to Tauri commands
- Build pipeline: AppImage + .deb

**Track 2: Cockpit UI** (new build)
- Sidebar nav: 今日 / 笔记库 / 知识图谱 / 任务 / 日程 / 回顾 / 资源库 / 模板 / 标签 / 智能体
- Main panel: Today + Daily Journal (today's log with 今日感悟 / 今日成就 / 今日关注)
- Right rail: Tasks + Reminders + Upcoming
- Bottom row: 捕获的想法 / 收藏与书签 / 记忆回顾
- Dark theme default, high density, vanilla JS (no React)

### v0.4.6 — Performance debt cleanup

In parallel with the cockpit work, fix the v0.3 perf rough edges:

- v0.4.6a — Replace full `innerHTML =` with a small diff or virtual diff
- v0.4.6b — Virtualize long lists (>200 items)
- v0.4.6c — Skeleton states instead of spinner
- v0.4.6d — Async file I/O
- v0.4.6e — Wikilink search debounce + cache

### v0.4.7 — Web Landing Page

- Single static `index.html` in `packages/web-landing/`
- Image 1 visual direction (dark hero, starfield, large serif title, 4 feature cards)
- Hosted on GitHub Pages

## Why this scope is reasonable

- The Tauri track is well-bounded (existing v0.3 web + Rust commands)
- The Cockpit track is large but well-scoped (single new layout)
- The perf track is small and independent
- The landing page is tiny (one HTML file)
- Total: ~15 issues across 4 tracks, 1 release

## Consequences

### Positive
- v0.4 ships the vision the user wants, not a half-step
- Cockpit is a clean rebuild using the design language from v0.2
- Tauri + Cockpit + Landing in one release = "the OS is real"

### Negative
- Large release scope = more risk
- v0.4 may slip if any track has issues
- Multiple parallel worktrees need coordination

### Mitigations
- Tauri track first (proven path) — blocks the Cockpit track
- Cockpit track starts when Tauri scaffolding is ready
- Each track has its own Issues and PRs
- Strict Evidence Gate per issue
- v0.4.6 perf work is independent and can ship anytime
