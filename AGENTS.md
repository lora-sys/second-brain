# AGENTS.md

> **The contract.** Every Agent (human or AI) reads this before touching the repo. Source of truth: this file. Conflicts resolved by latest ADR in `docs/decisions/`.

## 1. Project in One Paragraph

**Second Brain OS** — a local-first Personal Cognitive Operating System that turns Obsidian Vault + a Tauri desktop shell + an event stream into a continuously-understanding "second brain." Not "save things" — observe, relate, reflect, distill. v1 web SPA is shipped (v0.1–v0.3). Next: Tauri desktop (v0.4), AI Daily Memory (v0.5), Knowledge Graph (v0.6), Reflection Agent (v0.7), Personal Agent (v0.8+).

## 2. Core Philosophy

1. **Local-first.** No data leaves the machine unless the user explicitly shares.
2. **Obsidian is source of truth.** Vault files are the canonical store. The app is a viewer + indexer + agent layer.
3. **Markdown + YAML frontmatter is the contract.** Files must round-trip cleanly through Obsidian.
4. **AI understands, doesn't narrate.** The LLM's job is to surface event *relationships*, not to write polished prose.
5. **Personality over feature count.** The product feels like *the user, augmented* — not like a generic SaaS.
6. **Every change has Evidence.** No "Done" without screenshots / API traces / test runs.

## 3. Roles in this Repo

- `coordinator` — the Codex session acting as project lead. Reads `PROJECT_STATUS.md`, plans, dispatches, verifies. **Does not write business code directly.**
- `frontend` — Tauri + Web UI, components, motion, a11y, theming.
- `backend` — Node HTTP service + Tauri Rust commands + local DB.
- `database` — SQLite schema, migrations, seeds, FTS indexes.
- `agent` — LLM glue: prompt templates, RAG, daily journal generator, reflection agent. (TBD v0.5+)
- `qa` — runs Playwright e2e, captures screenshots, builds evidence packs.
- `bug-hunter` / `behavior-reviewer` / `architecture-reviewer` / `security-reviewer` / `ui-reviewer` — adversarial PR review.
- `release` — version bumps, changelog, GitHub release.
- `memory-curator` — promotes session findings into Source-of-Truth docs.

When the user says "develop this feature," the Coordinator decides which sub-agent to dispatch. We are a single Codex session, so we use **role-flavored reasoning** in the same session (not separate processes) — but we keep the role separation crisp in writing and in PRs.

## 4. Repository Layout

```
.
├── AGENTS.md                # this file
├── CLAUDE.md                # alias / mirror of AGENTS.md (compat)
├── PROJECT_STATUS.md        # live board — read this first
├── docs/
│   ├── INDEX.md             # master index (TOC + freshness)
│   ├── product/             # PRD, MVP, roadmap, feature specs, user stories
│   ├── architecture/        # system, frontend, backend, db, agent, security, deploy
│   ├── design/              # brand, tokens, components, motion, UI patterns, refs
│   ├── decisions/           # ADRs (NNNN-slug.md)
│   ├── evidence/<issue-id>/ # change-summary, test-results, screenshots, review-report
│   └── sessions/            # per-session logs
├── memory/
│   ├── project-memory.md    # stable product facts
│   ├── architecture-memory.md
│   ├── frontend-memory.md
│   ├── backend-memory.md
│   ├── decisions.md         # chronological decisions
│   └── lessons.md
├── sessions/current-session.md
├── tasks/                   # task board mirror
├── skills/                  # project-local skills
├── public/                  # web SPA (current v0.3 frontend)
├── lib/                     # Node HTTP server
├── server.mjs               # entry
├── package.json
├── config.json              # user-overridable config
└── src-tauri/               # Tauri desktop shell (TBD v0.4)
```

## 5. How Work Flows

1. **Issue** (`.github/ISSUE_TEMPLATE/feature.md`) is the unit of work. Each issue: user story, AC, out-of-scope, evidence, reviewers.
2. **Plan**: `plan` agent (or Coordinator) writes `docs/evidence/<id>/implementation-plan.md` — files touched, ADRs, sequencing, risks.
3. **Branch**: `feature/#<id>-<short>` in its own Worktree. **Never edit `main` directly.**
4. **Implement**: role-flavored reasoning. Keep diffs focused. Self-test before requesting review.
5. **PR**: open PR with the template. Link Issue, ADR, evidence.
6. **Adversarial review**: at minimum bug-hunter + behavior-reviewer + architecture-reviewer (UI Reviewer if UI). Findings → Fix Tasks → loop.
7. **Evidence Gate**: screenshots / API traces / test runs land in `docs/evidence/<id>/`. Coordinator checks before merge.
8. **Merge + Memory**: merge to `main`, close Issue, update `PROJECT_STATUS.md`, promote stable findings to `memory/`.
9. **Release**: when a milestone is done, run `release` agent — bump version, write CHANGELOG, draft GitHub release.

## 6. Coding Rules (the parts every Agent must follow)

- **No framework bloat.** Frontend is vanilla JS + CSS variables. No React, no Tailwind, no bundler. (Tauri shell is the only exception — Rust for the shell is fine.)
- **3 npm deps max for the web SPA.** Currently: `js-yaml`, `jsdom`, `marked`. Adding a new dep is an ADR.
- **File naming**: kebab-case for files, camelCase for JS vars, BEM-ish for CSS classes. Exceptions justified in PR.
- **Markdown frontmatter**: `type`, `title/name`, `status`, `created`, `updated` are mandatory for entities. Other fields per type — see `docs/architecture/data-model.md`.
- **Atomic writes**: write to `*.tmp-<pid>-<ts>`, then `rename`. No partial files in the vault.
- **Lenient frontmatter parse**: users edit files in Obsidian. The parser must salvage what it can (see `lib/frontmatter.mjs` `parseYamlLenient`).
- **No silent failures**: every async path has explicit error handling. UncaughtException handler in server.

## 7. Testing Strategy

- **Unit**: pure functions in `lib/` and `public/app.js` (when refactored out).
- **Integration**: HTTP API contract tests with real file fixtures.
- **E2E**: Playwright e2e via `playwright-cli`. Screenshots at key states saved to `docs/evidence/<id>/screenshots/`.
- **Visual**: web showcase (TBD) — takes screenshots from `localhost:3939` on a schedule.
- **Tauri**: Rust unit tests + integration tests against the local vault.
- **AI features** (TBD): prompt snapshots, deterministic seeds, RAG regression.

## 8. Security & Privacy

- **No telemetry by default.** If we add any, it's a feature flag and off by default.
- **Vault path is a user setting, not an env var.** Don't bake paths into code.
- **File writes go through atomic temp + rename.** No race conditions on crash.
- **TBD v0.4**: Tauri capabilities must be minimal. No shell access for the WebView. The only files touched are in the user-chosen vault.
- **AI features (v0.5+)**: Local LLM by default. If we add API support, it's opt-in per request and the prompt never leaves the machine unless user explicitly chooses cloud.

## 9. Definition of Done (per Issue)

- [ ] Issue body fully satisfied
- [ ] Acceptance Criteria all green
- [ ] Tests pass (`npm run check` + Playwright e2e where applicable)
- [ ] No console errors in browser
- [ ] No unhandled promise rejections in server log
- [ ] `docs/evidence/<id>/change-summary.md` written
- [ ] Screenshots / API traces in `docs/evidence/<id>/`
- [ ] Reviewer reports attached to PR
- [ ] `PROJECT_STATUS.md` updated
- [ ] If architecture-affecting: ADR filed or updated

## 10. How to Use This Skill

- `Use $ai-engineering-harness to bootstrap` — set up the structure on a fresh project.
- `Use $ai-engineering-harness to plan <feature>` — produce a Plan + Issue.
- `Use $ai-engineering-harness to implement <issue-id>` — work the issue with role-flavored reasoning, write Evidence.
- `Use $ai-engineering-harness to review <pr-id>` — adversarial review with at least bug-hunter + behavior-reviewer + architecture-reviewer.
- `Use $ai-engineering-harness to release <milestone>` — version bump, CHANGELOG, GitHub release.

## 11. Anti-Patterns This Project Refuses

- Editing `main` directly. Ever.
- Writing code without an Issue.
- Adding a framework "to make things cleaner."
- Sending vault content to a remote API without explicit user opt-in.
- A polished daily journal that hides the raw event stream — the stream is the product.
- Test-free merges.
- "We'll add LLM features later" with no plan — every AI feature has an Issue and an ADR.
