# v0.4.4.x — vault_read · Change Summary

## What changed

Added the `vault_read(id)` Rust Tauri command. Combined with the
existing `config_get` and `vault_list_all`, the Tauri desktop app can
now do read-only vault operations entirely without the Node HTTP
server.

### Command

`vault_read(id: String) -> Result<Entity, String>`

- `id` is `{directory}/{slug}` form, e.g. `"10-People/alice"`. Matches
  the `Entity.id` returned by `vault_list_all`.
- Resolves the directory name to entity type by inverting
  `cfg.directories`.
- Reads the file, parses YAML frontmatter (lenient), returns full
  `Entity` (id, type, slug, title, data, body, path).
- Errors: invalid id format, unknown directory, file missing,
  vault path unconfigured.

### Frontend bridge

Updated `public/app.js` so `api.read(id)` calls
`invokeOrFetch('vault_read', { id }, ...)` instead of raw fetch. The
Tauri webview now serves entity detail pages without needing the
Node dev server.

## Files

- `src-tauri/src/lib.rs`
  - `parse_id(id)` — split + validate id string
  - `vault_read(id)` — read single entity
  - Registered in `invoke_handler`
  - Added 5 unit tests; pre-existing 2 chdir-based tests converted
    to `SECOND_BRAIN_CONFIG` env var (no more parallel-test race)
- `public/app.js`
  - `api.read(id)` now goes through `invokeOrFetch('vault_read', { id }, ...)`

## Verification

### Rust unit tests (14/14 pass)
- 5 new tests: parse_id_basic / with_nested_path / rejects_empty,
  vault_read_returns_entity / missing_entity_returns_error /
  invalid_id_returns_error
- 9 pre-existing tests still pass

### Tauri-sim test (Playwright + mocked __TAURI__)
- Navigated to `http://127.0.0.1:3939/#/entity/10-People/alice`
- Invoke log shows `vault_read({id: "10-People/alice"})` was called
- Entity page rendered with title "Alice" and body containing the
  mock text from vault_read
- Console: 0 errors, 0 warnings

## What's not in this issue (deferred to v0.4.4.x follow-ups)

- vault_create / vault_update / vault_delete / config_set
- vault_search (substring match)
- vault_list_by_type (so api.list(type) works in Tauri)
- links_import (Rust port or thin HTTP proxy)
- VaultRepo struct (share cfg lookup + file IO across commands)
- typed Entity.data per entity type
