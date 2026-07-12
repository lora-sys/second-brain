# Inventory — 2026-07-12

## Repo state

- **Name**: second-brain
- **Remote**: github.com/lora-sys/second-brain
- **Current branch**: main (at v0.3.0)
- **Files tracked**: 45
- **Lines of code**: ~3500

## Languages / frameworks

- **Backend**: Node.js (vanilla HTTP) — no framework
- **Frontend**: Vanilla JS + native CSS — no framework, no build
- **Deps** (3 total): js-yaml, jsdom, marked

## Existing docs

- `docs/architecture.md` (legacy — kept for reference; v0.4+ uses `docs/architecture/`)
- `docs/data-model.md` (legacy — kept for reference)
- `docs/screenshots/` (8 v0.3 screenshots)
- `docs/assets/demo.webm` (v0.3 demo video)
- `docs/design-upgrade.md` (v0.2 design rationale)

## Existing tests

- `recordings/e2e-demo.mjs` — Playwright screencast script for demos
- No unit tests, no integration tests, no CI
- All testing is via `playwright-cli run-code` ad-hoc scripts

## Open issues / PRs

- 0 open issues, 0 open PRs (locally)
- GitHub repo: github.com/lora-sys/second-brain/issues — 0 open (private repo)
- 3 releases: v0.1.0, v0.2.0, v0.3.0 (all public)

## Last release

- v0.3.0 — 2026-07-12
- Features: Wikilink autocomplete, smart mentions, status popover, tag filter
- 3 reviewers (none — solo project)
- 0 critical issues open

## What needs bootstrap (Phase 0)

- [x] AGENTS.md + CLAUDE.md
- [x] PROJECT_STATUS.md
- [x] docs/{product,architecture,design,decisions,evidence,sessions} structure
- [x] docs/product/{vision,prd,mvp,roadmap}.md
- [x] docs/architecture/{system,frontend,backend,database,agent,security,deploy}.md
- [x] docs/decisions/{0001,0002,0003,0004}-*.md (4 ADRs drafted)
- [x] memory/{project-memory,architecture-memory,decisions,lessons}.md
- [x] .github/ISSUE_TEMPLATE/{bug,feature,refactor}.md
- [x] .github/PULL_REQUEST_TEMPLATE.md
- [x] sessions/current-session.md
- [x] docs/INDEX.md

## What's not done yet

- [ ] docs/product/prd.md (TBD)
- [ ] docs/product/mvp.md (TBD)
- [ ] docs/product/user-stories.md (TBD)
- [ ] docs/product/feature-specs/*.md (TBD)
- [ ] docs/design/{brand,tokens,components,motion,ui-patterns,references}.md
- [ ] ENGINEERING.md + TESTING.md (TBD)
- [ ] .codex/hooks.json (TBD)
- [ ] CI workflows: .github/workflows/{lint,test,build,docs-index}.yml
- [ ] docs/.index/manifest.json + relations.json + freshness.json
