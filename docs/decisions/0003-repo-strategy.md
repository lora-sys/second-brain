# ADR-0003: Single repo with `src-tauri/` subdir

- **Status**: Proposed
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.4 (TBD)

## Context

We need to ship a Tauri desktop app and keep the web SPA. Two natural structures:

1. **Single repo, two subdirs**: `public/` (web) + `src-tauri/` (Rust) + `lib/` (shared)
2. **Monorepo with workspaces**: `packages/web`, `packages/desktop`, `packages/core`
3. **Two repos**: `second-brain-web` and `second-brain-desktop`

## Decision

**Single repo, `src-tauri/` subdir alongside existing `public/` and `lib/`.**

- The Tauri shell's Rust code lives in `src-tauri/`
- The web frontend stays in `public/` and is loaded by Tauri as the renderer
- `lib/` (Node server) becomes optional — the desktop app uses Tauri commands instead, but the Node server can still serve the web showcase
- All docs, issues, memory live at the repo root

## Alternatives Considered

- **Monorepo with workspaces**: more setup, more concepts. Not worth the overhead for a project this size.
- **Two repos**: would mean the web showcase drifts from the desktop. We need them to stay in lockstep. Reject.

## Consequences

### Positive
- One git history, one issue tracker, one PR flow
- Shared `lib/` between web and desktop
- Docs and memory are colocated
- Easy to cross-link (e.g., "see ADR-XXXX for the schema")

### Negative
- Repo root gets a bit cluttered (`src-tauri/`, `public/`, `lib/`, `docs/`, `memory/`, `sessions/`)
- Web-only contributors see Rust files and vice versa
- CI needs to build both targets

### Mitigations
- `.gitignore` excludes Rust build artifacts (`src-tauri/target/`, `src-tauri/gen/`)
- CI matrix: lint, web-test, web-build, rust-test, tauri-build
- README has a "where to start" map

