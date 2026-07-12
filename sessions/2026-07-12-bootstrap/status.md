# Status — 2026-07-12 bootstrap session

## What I did

- Inventoried the existing v0.3 repo
- Created harness directory structure
- Wrote AGENTS.md (133 lines) + CLAUDE.md mirror
- Wrote 4 ADRs (Tauri strategy, LLM strategy, repo strategy, data schema)
- Wrote memory seed files (project, architecture, decisions, lessons)
- Wrote docs/INDEX.md and updated issue/PR templates

## What's pending

- 4 ADRs need human sign-off
- User needs to confirm Tauri v2 scope and priorities

## Open questions for the human

1. **Tauri webview strategy** (ADR-0001): wrap web as-is, or rewrite in a Tauri-native UI? My draft says "wrap as-is."
2. **LLM inference** (ADR-0002): local-only default with API opt-in, or include API from the start? My draft says "local-only default."
3. **Repo split** (ADR-0003): single repo with `src-tauri/`, or split into `second-brain-web` and `second-brain-desktop`? My draft says "single repo."
4. **v0.5 priority**: event stream collector first, or daily journal generator first?

## What I'll do next

Once human signs off on the 4 ADRs and answers the priority question, I'll:
1. Mark Phase 0 done in PROJECT_STATUS.md
2. Open issues for v0.4 (Tauri migration) and v0.5 (event stream + daily journal)
3. Set up ENGINEERING.md and TESTING.md
4. Begin v0.4.1 (Tauri init)

## Blockers

None. Awaiting human input.
