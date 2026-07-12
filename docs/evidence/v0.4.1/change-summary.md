# v0.4.1 — Monorepo Bootstrap · Change Summary

## What changed
- `lib/*.mjs` → `packages/core/src/`
- `server.mjs` → `packages/web/src/server.mjs`
- `config.json` → `packages/web/config.json`
- Added `packages/core/package.json` (@second-brain/core v0.1.0)
- Added `pnpm-workspace.yaml`
- Updated root `package.json` (workspace root, dev:web / dev:desktop / check scripts)
- Added `docs/config.example.env` (52 lines, all .env keys)
- Added `.env` / `*.env` to `.gitignore` (CRITICAL security)

## New modules
- `packages/core/src/llm/index.js` — `LocalEchoProvider` (deterministic stub), `CachedProvider` (TTL cache), `RetryProvider` (exponential backoff)
- `packages/core/src/llm/openai.js` — OpenAI-compatible provider factory (stub for v0.5)
- `packages/core/src/llm/audit.js` — `logToolCall()` writes to vault `00-AI/audit/`
- `packages/core/src/vault.mjs` extensions: `withFileLock`, `withLockedMutation`
- `vault.write()` now takes `{ locked: true }` (default true) — uses file lock

## Evidence
- `node --check` output: see `test-results/syntax-check.log`
- `find packages -type f`: see `test-results/tree.log`
- Self-review reports: see `review-report.md` (this directory)

## Migration path for users
- v0.3 users running `npm start` from root: now runs `node packages/web/src/server.mjs` via workspace script
- Old `lib/` path removed; all consumers use `@second-brain/core`
- `.env` (real secrets) should be created in repo root, not `docs/`
- See `docs/config.example.env` for available keys

## Follow-up issues filed
- v0.4.2 — move `public/` into `packages/web/`
- v0.4.3 — Tauri 2.0 init in `packages/desktop/`
- v0.4.4 — port `/api/*` to Tauri commands
