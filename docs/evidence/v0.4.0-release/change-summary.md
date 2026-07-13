# v0.4.0 — Release · Change Summary

## Tag

`v0.4.0` — pushed to origin, triggers GitHub Actions `release.yml` workflow.

## What's in this release

This release ships the Tauri desktop shell + Cockpit + Landing page + Knowledge graph.

### Major features

- **Tauri 2.0 desktop shell** — 10 Rust commands wrap the Node HTTP API.
  - `.deb` (Linux Debian/Ubuntu) — 4.6 MB
  - `AppImage` (Linux portable) — built by GitHub Actions on Linux runner
  - `rpm` (Linux Fedora/RHEL) — built by GitHub Actions
  - Raw binary (11 MB)
- **Cockpit Today Page** (`?cockpit=1`) — 12 sections: 今日 / 笔记库 / 知识图谱 / 任务 / 日程 / 回顾 / 资源库 / 标签 / 设置 + 2 placeholders (模板 / 智能体).
- **Knowledge graph** — top hubs from wikilinks + tag overlap.
- **Landing page** at `docs/index.html` — auto-deployed to GitHub Pages.

### Test coverage

- **49 Rust unit tests** pass 5/5 (vault, frontmatter parser, wikilink extraction, link_import, VaultRepo).
- **23 E2E tests** pass via `tests/e2e/real-device.mjs` — standard mode, all 10 working cockpit sections, API contracts.

### Bug fixes from real-device E2E

- cockpit's `renderContent` was wiping the adopted `<main id="main">` — fixed with `renderTarget()`.
- `回顾` nav entry had `impl: 'soon'` despite being implemented — fixed to `impl: 'review'`.

## Build artifacts

```
src-tauri/target/release/second-brain                  11 MB
src-tauri/target/release/bundle/deb/*.deb              4.6 MB
src-tauri/target/release/bundle/appimage/*.AppImage   ~12 MB (built by CI)
src-tauri/target/release/bundle/rpm/*.rpm             ~5 MB (built by CI)
```

Verified locally:
- `Second Brain_0.4.0_amd64.deb` — installed-size 15,076 KB
- Depends on `libwebkit2gtk-4.1-0`, `libgtk-3-0`

## How to install

```bash
# .deb (Debian/Ubuntu)
sudo dpkg -i "Second Brain_0.4.0_amd64.deb"
sudo apt-get install -f  # fix deps if needed
second-brain

# AppImage
chmod +x Second_Brain_0.4.0_amd64.AppImage
./Second_Brain_0.4.0_amd64.AppImage
```

## What comes next (v0.5+)

- v0.5 — Event stream + Daily Memory (local LLM)
- v0.6 — Knowledge graph v2 (canvas-based, semantic search)
- v0.7 — Reflection Agent (weekly pattern detection)
- v0.8 — Decision Journal
- v0.9+ — Personal Agent + Skill distillation

Backlog for v0.4.x:
- 模板 placeholder
- 智能体 placeholder
- v0.4.5.x: auto-restart after settings change
- v0.4.L2.x: custom domain + Schema.org + auto-update stats
