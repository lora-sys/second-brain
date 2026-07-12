# v0.4.c1 — Cockpit Skeleton · Change Summary

## What changed

- **New file** `public/lib/cockpit.js` (208 lines) — Cockpit UI module. Sidebar
  + multi-pane shell, 10 nav items (6 primary + 4 resources), topbar with
  quick actions, theme toggle, command palette, vault-name footer. Public API:
  `window.__cockpit.renderShell()`, `renderContent(route, hash)`, `setActive(hash)`.
- **`public/app.js`** — exposed the existing `renderDashboard` / `renderTasks`
  / `renderLinks` / `renderPeople` / `renderProjects` as `window.__renderX`
  so the cockpit can dispatch into the same code path. Added a `__bootCockpit`
  entry that swaps in the cockpit shell when `?cockpit=1` is in the URL.
- **`public/index.html`** — added `<script src="/lib/cockpit.js">` before
  `app.js` so cockpit.js is defined when app.js boots.
- **`public/style.css`** — added ~165 lines of cockpit-specific CSS:
  `.cockpit` grid (220px sidebar + 1fr main), `.cockpit-sidebar`,
  `.cockpit-nav-item`, `.cockpit-nav-badge` ("soon"), `.cockpit-topbar`,
  `.cockpit-content`, `.cockpit-placeholder` (for not-yet-implemented
  sections), `.cockpit-tags`, responsive breakpoints at 1100px / 720px,
  and the `body.cockpit-mode` overlay rules. Also added missing design
  tokens `--danger-soft` / `--danger-strong`.

## How the integration works

Cockpit mode is a *runtime overlay*, not a separate build:
1. `?cockpit=1` is detected by `__cockpitAutoBoot()` and `__bootCockpit()`
   is called instead of the standard `boot()`.
2. `__bootCockpit()` calls `__cockpit.renderShell()` which:
   - Hides the v0.3 `.app` element (so the old sidebar/topbar disappear)
   - Appends a `.cockpit` overlay to `<body>`
   - **Moves the existing `#main` element** from `.app` into the cockpit's
     content area — this is the trick that lets `renderDashboard`,
     `renderTasks`, etc. write into the cockpit without code changes
   - Mirrors `#page-title` text updates into the cockpit's `#cockpit-title`
     via a `MutationObserver`
3. `__cockpit.renderContent(impl, hash)` dispatches:
   - `'dashboard'` → `__renderDashboard()` (existing v0.3 dashboard)
   - `'tasks'` → `__renderTasks()` (existing v0.3 kanban)
   - `'links'` → `__renderLinks()` (existing v0.3 link grid)
   - `'tags'` → minimal placeholder (real impl is v0.4.c8)
   - everything else → "soon" placeholder with archive icon

The shell is idempotent (`adoptV3Elements` is guarded by a `moved` flag)
so re-renders don't double-append or re-move elements.

## What's not yet implemented (deferred to other v0.4 issues)

| Section        | Status | Tracked in       |
|----------------|--------|------------------|
| 笔记库 / 知识图谱 / 日程 / 回顾 / 模板 / 智能体 | `soon` placeholder | v0.4.c6 (cockpit-views-impl) |
| 标签 full management | `tags` placeholder | v0.4.c8 |
| 今日 full panel (with 今日感悟/成就/关注) | falls back to v0.3 dashboard | v0.4.c3 |
| 任务与提醒 right rail | not in this issue | v0.4.c4 |
| 捕获的想法 bottom row | not in this issue | v0.4.c5 |

## Evidence

- Playwright screenshots: see `screenshots/`
  - `01-dashboard.png` — 今日 route, full dashboard renders inside cockpit
  - `02-tasks.png` — 任务 route, v0.3 kanban renders inside cockpit
  - `03-resources.png` — 资源库 route, v0.3 link grid renders inside cockpit
  - `04-knowledge-soon.png` — 知识图谱 route, placeholder
  - `05-tags.png` — 标签 route, minimal placeholder
  - `06-v3-standard.png` — standard mode (no `?cockpit=1`) still works
- Browser console: 0 errors, 0 warnings across all routes.
- Syntax check: `node --check` clean on all touched files.

## Why a `?cockpit=1` toggle and not a hard cutover

Cockpit is the *desktop* UI per ADR-0005 (Image 3 cockpit), but Tauri 2.0
isn't in place yet (v0.4.3). Building cockpit as a web toggle lets us
iterate on it today, in the browser, with the real data and the real
renderers — and the same code path becomes the default in Tauri (v0.4.5
sets Tauri `build.devUrl` to `?cockpit=1`, or we split into
`cockpit.html` once the Tauri shell is in place). Throwing this work
away would mean redoing it later in a rush.
