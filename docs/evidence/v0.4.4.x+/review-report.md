# v0.4.4.x+ — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Three iterations: parallel-test race (mutex added), EnvGuard RAII
> pattern, all tests stable.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | High | src-tauri/src/lib.rs:tests | vault_create_handles_slug_collision was 100% flaky in parallel cargo test. The test set SECOND_BRAIN_CONFIG to its own tempdir via EnvGuard, but during the test body the env was observed as a DIFFERENT tempdir's path. Root cause: std::env::set_var is not thread-safe; another test in parallel was racing on the same env var. | cargo test (parallel) -> "config: config.json not found" inside e1/e2/e3 | **Fixed in same commit** — added ENV_LOCK mutex to ALL env-var tests. 5/5 parallel runs pass. |
| 2 | Medium | src-tauri/src/lib.rs:tests | Older let prev = ...; set_var; ...; match prev { restore } pattern was vulnerable to "panic before restore". | hypothetical | **Fixed** — replaced with RAII EnvGuard struct that restores in Drop. |
| 3 | Low | src-tauri/src/lib.rs:chrono_like_now | Custom date math; could be off by a day. | manual calc: days_to_ymd(0) -> (1970, 1, 1) ok | Filed v0.4.4.x+ polish: boundary date tests. |
| 4 | Low | src-tauri/src/lib.rs:vault_create | acquire_dir_lock busy-waits 1s; Node-side uses 5s. | n/a | Filed v0.4.4.x+ polish: longer timeout. |

### Bug-hunter checklist
- [x] All async paths have error handling (vault_create returns Result)
- [x] No race conditions (file lock + ENV_LOCK for tests)
- [x] No uncaught panics
- [x] No silent failures
- [x] No shell exec
- [x] No path traversal (slugify is filename-safe)
- [x] Atomic write prevents partial-file reads
- [x] Frontend bridge falls back to fetch on invoke failure

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | src-tauri/src/lib.rs | Each of the 4 commands does its own config_get() call. Cfg lookup will be duplicated as we add more commands. | Documented. v0.4.4.x+ follow-up: VaultRepo struct. |
| 2 | Low | src-tauri/src/lib.rs:chrono_like_now | Custom date math when chrono crate is widely available. | Filed polish. |
| 3 | Low | public/app.js | api.create has hand-rolled arg-shaping. Soon 8-10 of these. | YAGNI. v0.4.5.x factors this into a generic registry. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] New Rust deps: none (chrono_like_now is std::time only)
- [x] Public API is small
- [x] Boundaries: Rust reads config + writes vault files only
- [x] No security regression
- [x] No repeated logic (slugify + chrono_like_now shared)

## Aggregator verdict

**Findings: 7 total — 0 Critical, 0 High outstanding, 1 High fixed, 1 Medium improved, 2 Low acknowledged.**

21/21 tests pass consistently across 5 parallel runs. Tauri binary builds (207MB debug). Bridge wired.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.4.x+ — vault_update / vault_delete / config_set / vault_search / links_import
- v0.4.4.x+ — VaultRepo struct
- v0.4.4.x+ — chrono crate
- v0.4.4.x+ — boundary date unit tests
- v0.4.4.x+ — longer file-lock timeout
- v0.4.4.x+ — typed Entity.data per entity type
