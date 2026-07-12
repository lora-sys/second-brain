# Engineering

> Frontend / backend / database / API / Git / review rules. Read this before opening a PR.

## Frontend (`public/`)

- Vanilla JS, native HTML/CSS. No framework, no bundler, no build step.
- ≤ 3 npm deps total. Adding one needs an ADR.
- Code style: 2-space indent, single quotes, `camelCase` for vars, `kebab-case` for file names, BEM-ish for CSS classes.
- Components: each `render*()` function in `app.js` returns HTML. No virtual DOM. Re-render on data change.
- State: single `state` object at the top of the IIFE in `app.js`. Don't add frameworks like MobX.
- Markdown: `marked` v14 with custom renderer (see `setupMarked` in `app.js`). New API: renderers take objects, not positional args.
- Frontmatter: `lib/frontmatter.mjs` `parseYamlLenient` — don't change its strategy without an ADR.

## Backend (`server.mjs` + `lib/`)

- Vanilla Node HTTP. No Express / Koa / Fastify for now (Tauri commands will replace this in v0.4).
- Modules are ESM (`.mjs`). Use `import` / `export`, not `require`.
- All async paths have explicit error handling. No silent failures.
- `process.on('uncaughtException')` handler is in `lib/server.mjs` — keep it.
- File I/O: atomic write (temp + rename). See `lib/vault.mjs`.
- Frontmatter serialization: `lib/frontmatter.mjs` `stringify` — multi-line strings should use `|-` literal block scalar.

## Database (v0.5+)

- SQLite at `~/.local/share/second-brain/index.db`
- Schema migrations: `~/.local/share/second-brain/migrations/NNNN-name.sql`
- Each migration idempotent, wrapped in a transaction
- Schema version in `meta` table
- FTS5 virtual table over entity text (title, body, tags)

## API (v0.3 → v0.4 transition)

- **v0.3**: REST endpoints at `/api/*`. JSON request/response. No auth.
- **v0.4**: Tauri commands replace the endpoints. Frontend calls `window.__TAURI__.invoke('cmd_name', args)`.
- During transition, both can coexist (Tauri commands wrap HTTP).

## Git

- `main` is always shippable. Direct edits forbidden.
- `feature/#<id>-<short>` per Issue. Worktree-isolated.
- Conventional Commits: `feat(scope): description`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Squash-merge to main. PR body uses `.github/PULL_REQUEST_TEMPLATE.md`.
- Tag format: `vX.Y.Z`. Release per tag.

## Review

- ≥ 3 reviewers per PR: bug-hunter, behavior-reviewer, architecture-reviewer. Add ui-reviewer for UI, security-reviewer for auth/PII.
- Reviewer reports in `docs/evidence/<id>/review-report.md` with severity table.
- Critical / High findings → Fix Tasks → loop until clean.
- No merge with open Critical or High findings.

## Forbidden actions

- Editing `main` directly.
- Writing code without an Issue.
- Bypassing the Evidence Gate.
- Adding a framework "to make things cleaner."
- Sending vault content to a remote API without explicit user opt-in (see ADR-0002).
