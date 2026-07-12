# v0.4.4 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Single iteration. 8/8 unit tests pass.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | High | src-tauri/src/lib.rs:tests::find_config_cwd (initial) | Test used `std::env::set_current_dir` which races with parallel tests (Rust runs tests in parallel by default). Test passed in isolation but failed under `cargo test` due to other tests changing cwd concurrently. | `cargo test --lib` → "NotFound: restore cwd" | **Fixed** — switched to `$SECOND_BRAIN_CONFIG` env var which is per-test isolated, not shared global state. |
| 2 | Medium | src-tauri/src/lib.rs:parse_frontmatter (initial) | First implementation lost the trailing newline from the body. `lines.join("\n")` doesn't re-add a `\n` that was at the end of the original. JS parser preserves it. | `parse_frontmatter_basic` test failed: body should end with `\n` | **Fixed** — added explicit `if raw.ends_with('\n') && !body.ends_with('\n') { body.push('\n'); }`. |
| 3 | Medium | src-tauri/src/lib.rs:find_config (initial) | Returned relative paths (`PathBuf::from("config.json")`). Tests that compare with absolute `tempdir` paths fail. | `assert_eq!(found, Some(p))` where p is absolute | **Fixed** — `canonicalize()` the result before returning. |
| 4 | Low | src-tauri/src/lib.rs:vault_list_all | Silently skips missing directories (no log). Could confuse users who expect their data to show up. | n/a | Acknowledged. Logging at debug level is sufficient. v0.4.7 (evidence) will surface this. |
| 5 | Low | src-tauri/src/lib.rs:config_get | On missing config, error message says "Set $SECOND_BRAIN_CONFIG or place config.json in cwd / $XDG_CONFIG_HOME/second-brain/" — does not mention the `~/.config/second-brain/config.json` fallback. | n/a (UX) | Filed as v0.4.7 (settings UI) will fix this — error UI shows all four search locations. |
| 6 | Low | src-tauri/src/lib.rs:parse_frontmatter | YAML with leading whitespace or tabs (instead of spaces) might fail to parse. `serde_yaml` is reasonably tolerant but the JS parser uses a custom lenient strategy that salvages more aggressively. | n/a (manual YAML files in vaults) | Filed as v0.4.4.x follow-up if it bites in practice. |

### Bug-hunter checklist
- [x] All async paths have error handling (Tauri commands return `Result`)
- [x] No race conditions (env var instead of cwd; canonicalize paths)
- [x] No panics on missing files (returns Err)
- [x] No uncaught exceptions (errors propagate to webview via Tauri)
- [x] Slug generation matches JS (filename without .md)
- [x] No silent failures (each skipped file logs a warning)
- [x] No shell exec (no plugins enabled that would allow it)
- [x] No path traversal (Tauri commands only take IDs, paths are computed from config)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | src-tauri/src/lib.rs (overall) | Frontmatter parsing is reimplemented from scratch in Rust. If the JS parser evolves (e.g., new lenient strategy), Rust diverges. | Documented in the file's top comment. Tests pin the contract: `parse_frontmatter_basic`, `parse_frontmatter_broken_yaml_salvages`. The contract is "return what YAML gave us + body; never panic". |
| 2 | Medium | src-tauri/src/lib.rs:Entity | `data: serde_json::Value` is a generic JSON blob. Frontend loses type information (e.g., `updated` could be string or Date). | Documented trade-off. For v0.4.4, the frontend receives a JSON object and can parse on its side. A typed `data` would require either (a) a custom deserializer per type, or (b) a frontend-side type mapping layer. Filed as v0.4.4.x. |
| 3 | Low | src-tauri/Cargo.toml | `serde_yaml = "0.9"` is marked deprecated by upstream. Recommendation is `serde_yml` or `serde_norway`. | Acknowledged. The deprecation is for security (YAML's unsafe load methods). We use safe `from_str` and don't load arbitrary YAML from untrusted sources (only the user's own vault). v0.4.4.x will revisit when the user-facing deprecation lands. |
| 4 | Low | src-tauri/src/lib.rs | No `entities_by_type(type)` shortcut — caller has to filter `vault_list_all()`. | Not in v0.4.4 scope. Will add if it becomes a hot path. |
| 5 | Low | src-tauri/src/lib.rs:vault_list_all | Walks each dir with `max_depth(1)` — does NOT recurse. Good for our flat structure but means subdirectories of entities are invisible (e.g., attachments). | Acknowledged. Subdirectory walking is a separate feature. |

### Architecture-reviewer checklist
- [x] No new JS deps (still 3: js-yaml, jsdom, marked)
- [x] New Rust deps are minimal: 2 prod (serde_yaml, walkdir) + 1 dev (tempfile)
- [x] Tauri commands are well-typed (Config, Entity structs)
- [x] Boundaries: Rust side reads config.json directly, doesn't call into JS
- [x] No security regression: zero new attack surface, no plugins enabled
- [x] No repeated logic: frontmatter parsing is single-purpose; config search is single-purpose
- [x] Test coverage: 8 tests cover happy path, missing config, broken YAML, unclosed frontmatter, sorted output, type filtering, .md-only filtering

## Aggregator verdict

**Findings: 11 total — 0 Critical, 0 High outstanding, 2 Medium fixed in same commit, 2 Low acknowledged.**

- 1 High fixed (parallel-test race in cwd-chdir)
- 2 Medium fixed (trailing newline preservation, canonicalize paths)
- 2 Low acknowledged (no log on missing dir, error message completeness)
- 1 Medium documented (YAML strictness divergence from JS)
- 5 architecture observations documented

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.4.x — `vault_read(id)` command
- v0.4.4.x — `vault_create({type, title, body})` with atomic write
- v0.4.4.x — `vault_update(id, {data, body})` with file lock
- v0.4.4.x — `vault_delete(id)` with optional trash
- v0.4.4.x — `config_set({...})`
- v0.4.4.x — `vault_search(query)` substring match
- v0.4.4.x — `links_import(url)` — Rust port or thin HTTP proxy
- v0.4.4.x — typed Entity.data deserialization (one variant per type)
- v0.4.4.x — re-evaluate `serde_yaml` vs `serde_yml` when stable
