# v0.4.4.x++++ — VaultRepo Refactor + vault_list_by_type · Change Summary

## What changed

Two related improvements to the Tauri Rust side:

1. **VaultRepo struct** — extracts the config-lookup + per-directory
   walking pattern into a reusable struct. Eliminates ~60 lines of
   duplicated boilerplate between `vault_list_all` and the new
   `vault_list_by_type`.
2. **vault_list_by_type command** — new Tauri command that walks
   only one type's directory. Cheaper than `vault_list_all` when
   the caller only wants one type.

## VaultRepo

```rust
struct VaultRepo {
    config: Config,
    root: std::path::PathBuf,
}

impl VaultRepo {
    fn open() -> Result<Self, String> { ... }   // loads config, validates path
    fn walk(&self) -> Vec<Entity>            // all 4 types
    fn walk_type(&self, entity_type: &str) -> Vec<Entity>  // one type
}
```

`vault_list_all` now does:
```rust
let repo = VaultRepo::open()?;
let mut entities = repo.walk();
entities.sort_by(...);
Ok(entities)
```

Was 60 lines. Now 8.

## vault_list_by_type

```rust
#[tauri::command]
fn vault_list_by_type(entity_type: String) -> Result<Vec<Entity>, String> {
    if !TYPES.contains(&entity_type.as_str()) {
        return Err(format!("invalid type: {entity_type}"));
    }
    let repo = VaultRepo::open()?;
    Ok(repo.walk_type(&entity_type))
}
```

## Frontend bridge

`public/lib/api.js`: `api.list(type)` now uses invoke:
- If `type` is provided: `invokeOrFetch('vault_list_by_type', { entity_type: type }, ...)`
- If no type: `invokeOrFetch('vault_list_all', {}, ...)` (unchanged)

Browser mode still uses `fetch('/api/entities?type=X')`.

## Files

- `src-tauri/src/lib.rs`
  - Added `VaultRepo` struct + `open()` + `walk()` + `walk_type()` methods
  - Added `vault_list_by_type` Tauri command
  - Refactored `vault_list_all` from 60 lines → 8 lines using VaultRepo
  - Registered in `invoke_handler`
  - 3 new unit tests
- `public/lib/api.js`
  - `api.list(type)` now invokes `vault_list_by_type` when type is given

## Verification

### Rust unit tests (41/41 pass consistently across 5 parallel runs)
- `vault_list_all_reads_fixture_vault` (existing, now uses VaultRepo) — pass
- `vault_list_by_type_filters_correctly` — 2 people, 1 task; filter by type returns correct counts
- `vault_list_by_type_rejects_invalid` — "monster" → error
- `vault_list_by_type_missing_dir_returns_empty` — 20-Tasks dir doesn't exist; returns empty (not error)
- (all 38 pre-existing tests still pass after the refactor)

### Build
- `cargo check` clean
- `cargo build` clean
- `cargo test --lib` 41/41 deterministic

### Tauri-sim test (Playwright + mocked __TAURI__)
- `api.list('person')` → calls `invoke('vault_list_by_type', {entity_type: 'person'})`
- Returns filtered list (2 people from mock)
- 0 console errors

## Decisions made

### Read-only VaultRepo (no write methods)
- The repo is for enumerating entities. Write operations (create/update/delete)
  need per-directory file locks, which are orthogonal concerns.
- Filed v0.4.4.x+++++: add `VaultRepo::with_lock(dir, |repo| { ... })` for the
  write path too. Not done in this round to keep the refactor small.

### vault_list_by_type validates entity_type
- Returns error for unknown types (defense in depth — the frontend should
  only call with valid types, but server-side validation is correct)
- Empty Vec for missing directories (not error — vault may not have
  every type yet)
- Empty Vec for no matches (matches vault_list_all's behavior)

### Refactor scope: only vault_list_all
- The 5 other commands that need write locks (create/update/delete)
  don't get refactored in this round. Filed for v0.4.4.x+++++.
- This keeps the PR small and the diff easy to review.
- 38 existing tests pass after the refactor (no behavior change for
  the existing 8 commands).

## What's not in this issue (filed as v0.4.4.x+++++)

- Extend VaultRepo to write-path commands (with_lock helper)
- Refactor vault_create/update/delete/search to use VaultRepo::walk_type
- links_import (Rust port or thin HTTP proxy)
- typed Entity.data per entity type
- Generic api.* registry for arg-shaping (replaces per-method boilerplate)
