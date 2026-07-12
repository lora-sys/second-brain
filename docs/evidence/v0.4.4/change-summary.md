# v0.4.4 — Tauri Vault Commands · Change Summary

## What changed

Two Rust Tauri commands that the bundled desktop app can use for vault
operations, replacing (where needed) the Node HTTP server from v0.4.3.

### `config_get() → Config`
Reads `config.json` from one of (in order):
1. `$SECOND_BRAIN_CONFIG` (env override)
2. `$CWD/config.json`
3. `$XDG_CONFIG_HOME/second-brain/config.json`
4. `~/.config/second-brain/config.json`

Returns `{ vault_path, port?, host?, directories: {person, task, project, link} }`.

### `vault_list_all() → Vec<Entity>`
1. Calls `config_get()` to find the vault.
2. Walks each of `directories[type]` under `vault_path` (creates no dirs; silently skips missing types).
3. For every `.md` file:
   - Parses YAML frontmatter with `serde_yaml` (lenient — falls back to `{}` on parse error, mirrors JS `parseYamlLenient`).
   - Extracts `title` from frontmatter (falls back to slug).
   - Extracts `id` as `{dir_name}/{slug}`.
4. Sorts by `frontmatter.updated` desc, title asc tiebreak.

Returns `[{ id, type, slug, title, data, body, path }, ...]`.

### Dependencies added (Cargo.toml)
- `serde_yaml = "0.9"` — frontmatter parsing.
- `walkdir = "2"` — recursive directory walking.
- `tempfile = "3"` (dev-dep) — test fixtures.

### Tests (8/8 passing)
- `parse_frontmatter_basic` — title + tags + multi-line body round-trip
- `parse_frontmatter_missing_returns_body` — no frontmatter at all → empty data, full body
- `parse_frontmatter_unclosed_returns_body` — only opening `---` → graceful fallback
- `parse_frontmatter_broken_yaml_salvages` — invalid YAML mid-block → no panic
- `find_config_cwd` — finds `./config.json` when present in cwd
- `vault_list_all_reads_fixture_vault` — full E2E test: writes 2 people + 1 task + 1 .txt (ignored) + 1 stray .md (ignored), then asserts the result has exactly 3 entities in the right sorted order with correct types and bodies
- `config_get_reads_minimal_config` — minimal `{vault_path}` config parses cleanly
- `config_get_missing_returns_error` — missing config returns descriptive error

### Security posture (unchanged from v0.4.3)
- No shell plugin
- No fs plugin
- No http plugin
- Only `core:default` + explicit window perms
- Custom Tauri commands are auto-allowed by Tauri 2.0 (no capability entry needed for app-defined commands)

### Capability file (default.json)
Description updated to enumerate the two v0.4.4 commands and note the
upcoming v0.4.4.x follow-ups. Permissions unchanged.

## How to verify

```bash
cd src-tauri
cargo test --lib           # 8/8 pass
cargo check                # 0 warnings, 0 errors
cargo build                # produces target/debug/second-brain
```

End-to-end verification through Tauri runtime happens in v0.4.5 when
the frontend migrates from `fetch('/api/...')` to
`__TAURI__.invoke('cmd_name')`.

## What's not in this issue (filed as v0.4.4.x follow-ups)

- `vault_read(id)` — fetch one entity by id, returns full body
- `vault_create({type, title, body})` — write a new .md file with atomic temp+rename
- `vault_update(id, {data, body})` — overwrite existing entity
- `vault_delete(id)` — move to trash or hard-delete
- `config_set({...})` — write back to config.json
- `vault_search(query)` — substring match across title + body
- `links_import(url)` — call linkfetch.mjs equivalent in Rust (or via HTTP to a local proxy)
- Frontend migration: `fetch('/api/...')` → `__TAURI__.invoke('cmd_name', args)` (v0.4.5)

## Decision: minimum viable v0.4.4

We considered three paths:
A. Port all 8+ endpoints to Rust (estimated ~600 LOC, several hours of
   careful serde work for the Entity/Config types, body parsing, error
   handling).
B. Tauri sidecar: bundle `node` + `server.mjs` and spawn it from Tauri
   (~30MB extra in the bundle, fast to ship).
C. Just two commands (`config_get` + `vault_list_all`) — narrowest
   viable proof, every other endpoint follows incrementally.

We picked **C** because:
- It demonstrates the bridge end-to-end with minimal surface.
- It unblocks v0.4.5 (frontend rewire) without requiring the full Rust
  re-implementation of every endpoint.
- The other endpoints are incremental — each can land as its own PR
  without blocking the desktop packaging track.
- v0.4.5's rewire can selectively migrate endpoints as Rust commands
  land, with `fetch('/api/...')` as fallback for not-yet-ported ones.

If A turns out to be needed for any reason (e.g., the Node sidecar is
rejected for bundle size), the existing commands show the pattern.
