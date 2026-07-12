# Status — 2026-07-12 bootstrap session

## What I did

- Inventoried the existing v0.3 repo
- Created harness directory structure
- Wrote AGENTS.md (133 lines) + CLAUDE.md mirror
- Wrote 6 ADRs (Tauri strategy, LLM, repo, data, UI, agent protocol)
- Wrote memory seed files
- Wrote docs/INDEX.md and updated issue/PR templates
- Filed issue #1 for v0.4.1 (monorepo bootstrap)
- **Implemented v0.4.1**: extracted `lib/` → `packages/core/`, added LLM adapter interface, file lock primitives, .env.example, audit log
- **Self-reviewed v0.4.1** as bug-hunter + architecture-reviewer
- **Filed follow-up issues** #2, #3 from review findings
- Self-audit found 10 critical gaps for "agent app" readiness (conversations, retries, concurrency, E2E AI testing)

## What's pending

- v0.4.2 — web package (move public/ into packages/web/)
- v0.4.3 — Tauri init in packages/desktop/
- v0.4.4 — Tauri commands (Rust port of HTTP endpoints)

## Open questions for the human

None. All ADRs signed off. Tauri scope confirmed: include Cockpit UI in v0.4.

## What I'll do next

1. v0.4.2 — move public/ into packages/web/
2. v0.4.4 — port HTTP endpoints to Tauri commands (Rust)
3. v0.4.6 — performance debt fixes (5 sub-issues)
4. v0.4.c* — Cockpit UI rebuild (7 sub-issues)
5. v0.4.L* — Landing page (2 sub-issues)

## Blockers

None.
