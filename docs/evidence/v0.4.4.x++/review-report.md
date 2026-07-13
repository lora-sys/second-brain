# v0.4.4.x++ — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. 6 new tests, all 27 pass in parallel.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | src-tauri/src/lib.rs:vault_update | `data: None, body: None` would still bump `updated` and rewrite the file. Side effect: an "empty" update still touches the file's mtime. | Acknowledged. Documented in signature. v0.4.4.x+++ polish: early-return if both are None. |
| 2 | Low | src-tauri/src/lib.rs:vault_delete:trash | Trash filename uses `chrono_like_now().replace(['', '.'], '-')` which is a bit cryptic. Filenames are like `trashme-2026-07-13T10-44-21Z.md`. | Acceptable — sortable, unique enough. Filed polish. |
| 3 | Low | src-tauri/src/lib.rs:vault_update | The merge for the body field is "if Some, replace; if None, keep existing". But existing_body comes from parse_frontmatter which strips the trailing newline. So round-tripping an entity that has trailing whitespace loses it. | Edge case. Acknowledged. v0.4.4.x+++ polish: preserve body byte-for-byte if no body in the update. |

### Bug-hunter checklist
- [x] All async paths have error handling (vault_update + vault_delete return Result)
- [x] No race conditions (file lock + ENV_LOCK for tests)
- [x] No uncaught panics (parse_id rejects invalid input)
- [x] No silent failures
- [x] No shell exec
- [x] No path traversal (parse_id rejects unknown types/dirs)
- [x] Atomic write prevents partial-file reads (update)
- [x] Frontend bridge falls back to fetch on invoke failure

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | src-tauri/src/lib.rs | 6 commands now (config_get, vault_list_all, vault_read, vault_create, vault_update, vault_delete). Each does its own `config_get()` and lock acquisition. Cfg lookup + lock + write boilerplate is duplicated. | Documented. v0.4.4.x+++ introduces VaultRepo. |
| 2 | Low | public/app.js | api.update / api.delete have hand-rolled arg-shaping. Soon 8-10 of these. | YAGNI. v0.4.5.x factors this into a generic registry. |

### Architecture-reviewer checklist
- [x] No new JS deps
- [x] No new Rust deps
- [x] Public API is small: vault_update(String, Option<Value>, Option<String>), vault_delete(String, Option<bool>)
- [x] Boundaries: Rust reads config + writes vault files only
- [x] No security regression
- [x] Reuses acquire_dir_lock + chrono_like_now (DRY)

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 5 Low acknowledged.**

27/27 tests pass consistently across 5 parallel runs. Tauri binary builds. Bridge wired.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.4.4.x+++ — config_set + vault_search + links_import + vault_list_by_type
- v0.4.4.x+++ — VaultRepo struct
- v0.4.4.x+++ — vault_update early-return on empty update
- v0.4.4.x+++ — vault_update preserve body byte-for-byte
- v0.4.4.x+++ — soft-delete restore UI
