# ADR-0005: Desktop = Productive Cockpit, Web = Landing Page

- **Status**: Accepted
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.4 (TBD)

## Context

The user shared two design directions:

1. **"Second Brain OS" landing page** (Image 1): marketing-style hero with starfield, large serif title, 4 feature cards (auto-capture / smart-organize / local-first / long-term memory). Dark, premium, "OS" product feel.
2. **"Productive Cockpit" daily dashboard** (Image 2 & 3): full app UI with left sidebar (今日 / 笔记库 / 知识图谱 / 任务 / 日程 / 回顾 / 资源库 / 模板 / 标签 / 智能体), main column (今日 · 5月20日 星期二 → 每日日志 with 今日感悟 / 今日成就 / 今日关注), right column (任务与提醒 / 即将到来), bottom row (捕获的想法 / 收藏与书签 / 记忆回顾).

The existing v0.3 web SPA looks like neither — it's a clean generic SaaS dashboard.

## Decision

**Two distinct surfaces:**

### Desktop app (Tauri shell)
- **Style**: "Productive Cockpit" — sidebar nav, today panel, 任务提醒 right rail, 捕获/收藏/记忆回顾 bottom row
- **Library**: still vanilla JS, no React. Rebuild the layout to match the cockpit vision.
- **Density**: high — feels like a working tool, not a marketing site
- **Theme**: default to dark (matches the cockpit screenshots)

### Web (Landing Page)
- **Style**: "Second Brain OS" marketing landing — hero + features + download CTA
- **Goal**: attract users to download the desktop app
- **Stack**: can be a separate Astro / static site, but we can also keep it as a single `index.html` in the web package with no JS dependencies
- **Hosted**: GitHub Pages or personal server (TBD)

## Consequences

### Positive
- Each surface is optimized for its purpose
- The cockpit is built specifically for the user's daily workflow
- The landing page is a clean, focused marketing surface
- The two can iterate independently

### Negative
- v0.4 ships a *new* UI (the cockpit), not just the v0.3 web in a shell — that's a redesign on top of a tech migration
- The current v0.3 web SPA needs to be replaced, not just wrapped
- Two surfaces to maintain

### Mitigations
- Phased approach: v0.4 ships the *current* v0.3 UI inside Tauri first (proves the packaging), then v0.5+ replaces the UI with the cockpit
- The landing page is mostly static — minimal maintenance
- The web package still ships the v0.3 SPA in a "showcase" route for users who don't want the desktop app yet
