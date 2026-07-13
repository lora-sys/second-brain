# v0.4.4.x++ — vault_update + vault_delete · Change Summary

## What changed

Two more Tauri commands that complete the CRUD loop for the desktop
app: `vault_update` (modify existing entity) and `vault_delete`
(remove entity, with optional trash support).

Combined with `vault_create` (v0.4.4.x+), the Tauri desktop app now
covers the full read-write-delete lifecycle for entities.

## Commands

### `vault_update(id, data, body) -> Result<Entity>`

- `id`: `{directory}/{slug}` form (must exist on disk)
- `data`: optional `serde_json::Value` (object). Unspecified keys are
  preserved from the existing frontmatter.
- `body`: optional `String` — replaces the markdown body. If `None`,
  the existing body is preserved.
- Always updates the `updated` field to the current timestamp.
- Atomic write: tmp + rename, with directory lock.

### `vault_delete(id, trash) -> Result<()>`

- `id`: `{directory}/{slug}` form
- `trash`: optional `bool` (default `false`). If `true`, the file
  moves to `<vault>/.trash/<slug>-<timestamp>.md` (recoverable).
  If `false`, the file is unlinked (permanent).
- The file must exist; otherwise the command errors.

## Frontend bridge

`public/app.js`:
- `api.update(id, body)` → `invokeOrFetch('vault_update', {id, data, body}, ...)`
- `api.delete(id)` → `invokeOrFetch('vault_delete', {id, trash: false}, ...)`

Both fall back to fetch in browser mode (no behavior change there).

## Files

- `src-tauri/src/lib.rs`
  - `vault_update(id, data, body)` — read existing → merge data → atomic write
  - `vault_delete(id, trash)` — unlink or move to `.trash/`
  - Registered in `invoke_handler`
  - 6 new unit tests (3 for update, 3 for delete)
- `public/app.js`
  - `api.update` / `api.delete` now invoke-first with fetch fallback

## Verification

### Rust unit tests (27/27 pass consistently across 5 parallel runs)
- `vault_update_modifies_existing_file` — verifies title/type preserved,
  added `status:done`, body replaced
- `vault_update_preserves_unspecified_keys` — calls update with `data:None`,
  checks that priority/tags/updated survive
- `vault_update_missing_entity_returns_error`
- `vault_delete_removes_file` — file is gone after delete
- `vault_delete_to_trash_moves_file` — file is in `.trash/` with
  original name in the filename
- `vault_delete_missing_entity_returns_error`

### Build
- `cargo check` clean
- `cargo build` produces working binary
- `cargo test --lib` 27/27 deterministic

## Lessons

- `vault_update` is the inverse of `vault_create` for the merge step:
  create builds the frontmatter from scratch (auto-adds created/updated),
  update reads existing first and merges so unspecified keys survive.
  This is the difference between "set" and "patch" semantics — for
  full entity replacement the caller can still pass all keys.
- Trash support is opt-in. v0.4.4.x++ defaults to hard delete (the
  Node server's `vault.delete` also hard-deletes). Soft-delete via
  trash is exposed via the `trash: true` flag.
- File lock for both update and delete is per-directory (not per-file)
  — same `.sb-lock` marker. Adequate for human-driven edit patterns
  and matches the existing pattern from v0.4.4.x+.

## What's not in this issue (filed as v0.4.4.x+++ follow-ups)

- `config_set({...})` — write back to config.json
- `vault_search(query)` — substring match
- `links_import(url)` — fetch + parse + write
- `vault_list_by_type(type)` — narrow `api.list(type)` to Tauri path
- VaultRepo struct to share cfg lookup across all 6 commands
- Soft-delete restore UI (currently trash files just sit there)
