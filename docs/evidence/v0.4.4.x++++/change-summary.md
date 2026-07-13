# v0.4.4.x++++ — config_set · Change Summary

## What changed

Added `config_set(update)` Rust Tauri command. The 8th Tauri command.

The Tauri desktop app can now update its own config (vault path,
port, host, directories) from within the app — no more hand-editing
`config.json`. Combined with the existing 7 commands, the desktop
app is fully self-sufficient for setup + CRUD + search.

## Command

`config_set(update: ConfigUpdate) -> Result<Config>`

`ConfigUpdate` is a partial-update struct:
- `vault_path: Option<String>` — new path (must be non-empty if Some)
- `port: Option<u16>`
- `host: Option<String>`
- `directories: Option<HashMap<String, String>>` — **replaces** the
  map entirely if Some, preserves if None

The command:
1. Reads the current config
2. Applies only the fields that are `Some` (patch semantics)
3. Validates `vaultPath` is non-empty
4. Serializes + atomic write (tmp + rename) under a per-file lock
5. Returns the updated config

## Frontend bridge

`public/app.js`: `api.config.put(body)` now calls
`invokeOrFetch('config_set', {vaultPath, port, host, directories}, ...)`
in Tauri mode. Browser mode still uses `fetch('/api/config')` PUT.

## Files

- `src-tauri/src/lib.rs`
  - `ConfigUpdate` struct (partial-update DTO with all Option fields)
  - `config_set(update)` — read, merge, atomic write
  - `acquire_file_lock` / `release_file_lock` — per-file lock for config.json
  - Registered in `invoke_handler`
  - 4 new unit tests
- `public/app.js`
  - `api.config.put` → `invokeOrFetch('config_set', {...}, ...)` in Tauri mode

## Verification

### Rust unit tests (38/38 pass consistently across 5 parallel runs)
- `config_set_updates_fields` — vaultPath, port, host all updated;
  directories (None) preserved
- `config_set_replaces_directories_when_some` — passing Some directories
  replaces the entire map
- `config_set_rejects_empty_vault_path` — empty/whitespace errors
- `config_set_atomic_writes_via_tmp` — no `.tmp-*` or `.lock` files
  remain after write

### Build
- `cargo check` clean
- `cargo build` clean
- `cargo test --lib` 38/38 deterministic

## Decisions made

### Patch semantics (Option fields) instead of full replace
- Caller sends only fields they want to change. The user changing
  just the port doesn't have to send the full directories map.
- Reduces payload size and reduces the chance of accidentally
  clobbering an unrelated field.

### Directories: replace vs merge
- If `directories: Some(map)` is passed, the entire map is replaced
  (not merged key-by-key). This is simpler than per-key merge and
  matches the common case (user renames a directory).
- If `directories: None`, the existing map is preserved.

### Allow setting non-existent vaultPath
- config_set does NOT create the directory. It just writes the config.
- The user may be configuring a path that will be created later
  (e.g. by a setup wizard). Errors are for genuinely bad input
  (empty string).

### Per-file lock separate from per-directory lock
- config.json gets its own `.json.lock` marker file
- Prevents racing config writes (which would lose data)
- Doesn't conflict with vault directory locks

## What's not in this issue (filed as v0.4.4.x+++++ follow-ups)

- config_set in v0.5 Settings UI (caller is the settings panel)
- VaultRepo struct refactor (share config + lock + walk across 8 commands)
- links_import (Rust port or thin HTTP proxy)
- vault_list_by_type (narrow `api.list(type)` to Rust path)
