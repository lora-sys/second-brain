# ADR-0001: Tauri 2.0 wraps existing web frontend (no rewrite)

- **Status**: Proposed
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.4 (TBD)

## Context

The web SPA at `public/` is mature (v0.3, 4 entity types, kanban DnD, wikilink, smart mentions, tag filter). v0.4 ships a desktop shell via Tauri v2.

We must choose: **Tauri wraps the existing web frontend as-is**, or we **rewrite the UI in a Tauri-native framework** (e.g., Svelte, React via Tauri, plain Rust+Webview).

## Decision

**Tauri wraps the existing `public/` as-is.** The webview loads `http://localhost:PORT` in dev and `dist/` in release. The Rust side only handles file system, settings, and OS integration.

## Alternatives Considered

- **A. Rewrite UI in Svelte + Tauri commands**: Cleaner long-term but ~3x effort to rebuild all v0.3 features. Risk of regression. Delays v0.4 by weeks.
- **B. Build a separate Tauri-native shell, no webview**: Loses all existing features. Massive rewrite.
- **C. Use a web framework (React) via Tauri**: Same downside as A — full rewrite, no benefit since we already have a working web frontend.

## Consequences

### Positive
- v0.4 ships in days, not weeks
- All v0.3 features (CRUD, kanban, wikilink, smart mentions, tag filter) carry over for free
- The web showcase stays as a separate static deploy, exactly as-is
- We can iterate on the web frontend as before

### Negative
- We carry a vanilla-JS + CSS-variables frontend in a Tauri shell — slightly weird in 2026
- The web showcase has a different visual identity from the desktop (web → marketing site, desktop → app)
- Future Tauri-native UI features (system tray menus, OS notifications) need JS bridges

### Mitigations
- Tauri commands are JS-callable, so we can keep adding native features without rewriting the UI
- If we ever want a Tauri-native UI, the Rust commands stay the same; only the renderer changes
- The web showcase is a separate concern and can be redesigned independently

## Follow-ups

- ADR-0003 (repo strategy) — confirm single repo
- ADR-0004 (LLM strategy) — Tauri commands are also where the LLM call wrapper lives
