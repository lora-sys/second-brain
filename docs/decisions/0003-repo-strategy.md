# ADR-0003: Monorepo workspace with packages/web + packages/desktop

- **Status**: Accepted
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.4 (TBD)

## Context

We need to ship a Tauri desktop app and keep the web SPA. Three structures considered:

1. **Single repo, two subdirs**: `public/` + `src-tauri/`
2. **Monorepo with workspaces**: `packages/web` + `packages/desktop` + `packages/core` (shared Rust commands or shared JS lib)
3. **Two repos**: `second-brain-web` + `second-brain-desktop`

## Decision

**Monorepo with pnpm workspaces**, restructured as:

```
second-brain/
├── packages/
│   ├── core/             # shared JS lib (vault, frontmatter, linkfetch, types)
│   ├── web/              # v0.4 web SPA (moved from public/)
│   ├── desktop/          # Tauri shell (Rust + loads packages/web)
│   └── agent/            # MCP server + agent-side code (v0.9+)
├── docs/                  # at root
├── memory/                # at root
├── sessions/              # at root
└── package.json           # workspace root
```

- `packages/core` is the shared JS lib (extracted from current `lib/`)
- `packages/web` is the existing v0.3 SPA (renamed from `public/`)
- `packages/desktop` is the Tauri 2.0 Rust shell; its webview loads `packages/web/dist` after build
- `packages/agent` (added v0.9+) hosts the MCP server so external AIs (Claude Desktop, Codex CLI, Hermes) can call Second Brain

## Migration from v0.3

1. Move `lib/*.mjs` → `packages/core/src/`
2. Move `public/*` → `packages/web/public/`
3. Move `server.mjs` → `packages/web/src/server.mjs` (or `packages/core/`)
4. Move `package.json` deps into per-package manifests
5. Add `pnpm-workspace.yaml` and root `package.json` with workspace scripts
6. Create `packages/desktop/` with Tauri init
7. Update CI to build all three packages in matrix

## Consequences

### Positive
- Clear boundaries between web / desktop / core / agent
- `core` is the source of truth for vault logic; both web and desktop import it
- Can swap one package without touching others
- Workspace tooling (pnpm) handles cross-package symlinks automatically
- Future `agent` package fits naturally

### Negative
- More setup ceremony (workspace config, multiple package.jsons)
- Refactor risk during the move (existing v0.3 users need to update their setup)
- Initial learning curve for contributors

### Mitigations
- Document the migration in CHANGELOG.md
- Keep a single root-level `npm start` that runs the web package
- Test the v0.3 e2e suite at every step of the move
- A "monorepo bootstrap" workflow script under `scripts/`
