# ADR-0007: Flat lib/ at root — Monorepo deferred to v0.5+

- **Status**: Accepted (supersedes ADR-0003)
- **Date**: 2026-07-12
- **Deciders**: @coordinator
- **Driver Issue**: v0.4 (Tauri + Cockpit + Landing)

## Context

ADR-0003 (2026-07-12) committed us to a pnpm monorepo with `packages/{core, web, desktop, agent}`. The implementation landed in v0.4.1 (commit `47e2889`) and was reviewed + accepted with evidence (`docs/evidence/v0.4.1/`).

Within the same session, the working tree was reverted: `lib/*.mjs` was restored at the repo root, `packages/core/` and `packages/web/src/server.mjs` were deleted, `pnpm-workspace.yaml` was removed, and root `package.json` dropped its `workspaces` field. The substantive content of v0.4.1 (LLM adapter interface, `withFileLock` concurrency primitives, AI audit log, `.env.example`) survived the move intact.

This ADR formalizes that decision and sets the trigger conditions for revisiting it.

## Decision

**Use a flat structure with `lib/` at the repo root for v0.4.** Monorepo is deferred until we have a real second consumer that benefits from workspace tooling.

Concrete layout:

```
second-brain/
├── lib/                   # vault, frontmatter, linkfetch, server, llm/
│   ├── frontmatter.mjs
│   ├── linkfetch.mjs
│   ├── server.mjs
│   ├── vault.mjs
│   └── llm/               # LocalEchoProvider, CachedProvider, RetryProvider,
│                          # createOpenAIProvider, audit
├── public/                # web SPA (v0.3 + cockpit overlay)
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── lib/               # frontend libs (marked, wikilink, cockpit)
├── server.mjs             # entry — imports `./lib/server.mjs`
├── config.json            # user-overridable runtime config (gitignored)
├── docs/                  # at root
├── memory/                # at root
├── sessions/              # at root
├── package.json           # single manifest, 3 deps (js-yaml, jsdom, marked)
├── pnpm-workspace.yaml    # removed
└── src-tauri/             # TBD in v0.4.3
```

## Why we're reverting the monorepo

Three reasons, in priority order:

1. **We have one app.** The web SPA is the only consumer of `lib/`. A workspace buys us nothing yet — it just adds a `package.json` per package, a `pnpm-workspace.yaml`, and the mental overhead of "which package does X live in?".

2. **Tauri is a Rust crate, not a JS package.** Tauri 2.0 lives in `src-tauri/` with its own `Cargo.toml`. It's not a JS workspace member. The pnpm monorepo doesn't help Tauri at all — Cargo does.

3. **Setup ceremony slowed us down.** Every script (dev, build, check, test) had to be re-plumbed through workspaces, and every "where does this file live?" question had a workspace answer. For one app, that overhead is pure tax.

## What we kept

The v0.4.1 deliverables that justified the work:

- `lib/llm/index.mjs` — `LlmProvider` interface, `LocalEchoProvider` (deterministic stub), `CachedProvider` (TTL cache), `RetryProvider` (exponential backoff)
- `lib/llm/openai.mjs` — `createOpenAIProvider()` factory (stub for v0.5)
- `lib/llm/audit.mjs` — `logToolCall()` writes to vault `00-AI/audit/<date>/<ts>.md`
- `lib/vault.mjs` extensions: `withFileLock`, `withLockedMutation` (concurrency primitives)
- `docs/config.example.env` — documented `.env` keys
- `.env` stays in `.gitignore` (security invariant preserved)

## Trigger conditions for revisiting monorepo

Reopen the monorepo question (re-derive this ADR) when **any** of:

- We add a second deployable that shares `lib/` logic and needs its own deps (e.g., a CLI binary, a worker process, a desktop-only module that wants different deps from the web SPA)
- We add the `agent` package (planned for v0.9 MCP server) and it has dep overlap with `core` worth deduplicating
- The web SPA exceeds 3 npm deps (per AGENTS.md "3 deps max" rule — at that point pnpm deduplication earns its keep)
- We need to publish any package to npm

Until one of these fires, the flat structure wins on simplicity.

## Consequences

### Positive
- Single `npm run dev` starts the app — no workspace plumbing
- One `package.json` to read, one set of deps to audit
- Tauri setup is independent of JS structure (it'll add `src-tauri/Cargo.toml` and that's it)
- The "monorepo overhead tax" stays out of v0.4

### Negative
- If we ever add a desktop-only feature with its own deps, we lose workspace deduplication
- `lib/` will grow as a single folder until a real boundary appears
- The published package story (if we ever want one) will require a future migration

### Mitigations
- Module boundaries inside `lib/` are enforced by clear filenames (`vault.mjs`, `frontmatter.mjs`, `linkfetch.mjs`, `llm/index.mjs`) — not by package boundaries
- When a real second consumer appears, the migration to pnpm workspaces is mechanical: split `lib/*` into `packages/core/src/`, move each npm dep to its owning package's manifest

## ADR-0003 status

ADR-0003 is **Superseded**. The decision it recorded ("monorepo with pnpm workspaces") is no longer in force. ADR-0007 is the new contract for v0.4.
