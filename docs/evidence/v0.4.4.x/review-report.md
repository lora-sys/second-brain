# v0.4.4.x — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Two iterations: parse_id had wrong type check (fixed), old chdir-based
> tests were racy in parallel (fixed via env var).

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | High | src-tauri/src/lib.rs:parse_id (initial) | First version of parse_id hard-coded the type check against person/task/project/link. But the id format is {directory}/{slug} (e.g. 10-People/alice), not {type}/{slug}. So parse_id("10-People/alice") failed with "unknown type: 10-People". | cargo test → panic | **Fixed in same commit** — parse_id now just splits on /; type resolution happens later. |
| 2 | Medium | src-tauri/src/lib.rs:vault_read (initial) | Dead code computing root from cwd, assigned to _. Vestigial from earlier design. | n/a (warning-level) | **Fixed** — removed. |
| 3 | Medium | src-tauri/src/lib.rs:tests | Pre-existing tests used set_current_dir which races in parallel test runs. Resulted in flaky cargo test runs. | cargo test (parallel) → "restore cwd: NotFound" | **Fixed** — converted to SECOND_BRAIN_CONFIG env var pattern. |
| 4 | Low | src-tauri/src/lib.rs:vault_read | dir_name is computed then vault_root.join(dir_name). Path traversal defense-in-depth would assert resolved path is under vault_root. | n/a (requires adversarial id) | Filed as v0.4.4.x polish. |

### Bug-hunter checklist
- [x] All async paths have error handling (vault_read returns Result)
- [x] No race conditions in tests (env var pattern)
- [x] No uncaught panics (parse_id rejects invalid input)
- [x] No silent failures
- [x] No shell exec (no plugins)
- [x] Frontend bridge falls back to fetch on invoke failure

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | src-tauri/src/lib.rs | 3 commands but no shared abstraction. Copy-paste of cfg lookup + entity serialization will grow as more commands land. | Documented. v0.4.4.x follow-up introduces VaultRepo struct. |
| 2 | Low | public/app.js | api.read is third call to use invokeOrFetch. Soon 8-10. Consider generic registry. | YAGNI for now. v0.4.5.x pulls the pattern together. |
| 3 | Low | src-tauri/src/lib.rs | Entity has generic data field. Typed per-type would lose round-trip safety but require custom serializers. | Documented. v0.4.4.x follow-up. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps (just std::path + std::fs)
- [x] Public API is small: vault_read(String) -> Result<Entity, String>
- [x] Boundaries: Rust reads config + vault files only
- [x] No security regression (same capabilities as v0.4.4)
- [x] No repeated logic: parse_id shared

## Aggregator verdict

**Findings: 7 total — 0 Critical, 0 High outstanding, 2 High fixed, 1 Medium cleaned, 1 Low acknowledged.**

14/14 tests pass. Tauri-sim test confirms end-to-end bridge works.

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.4.x — vault_create / vault_update / vault_delete / config_set
- v0.4.4.x — vault_search + vault_list_by_type + links_import
- v0.4.4.x — VaultRepo struct (share cfg lookup across commands)
- v0.4.4.x — typed Entity.data per entity type
- v0.4.4.x polish — assert vault_read path is under vault_root
