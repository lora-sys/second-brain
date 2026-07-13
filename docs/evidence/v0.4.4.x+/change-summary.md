# v0.4.4.x+ — vault_create · Change Summary

## What changed

Added `vault_create(entity_type, title, body, data?)` Rust Tauri
command. The Tauri desktop app can now WRITE new entries to the
vault. Combined with `config_get` + `vault_list_all` + `vault_read`
from earlier work, the desktop app covers the read-write loop
for creating entities.

## Command signature

`vault_create(entity_type: String, title: String, body: String, data: Option<serde_json::Value>) -> Result<Entity, String>`

- `entity_type` must be one of `person` / `task` / `project` / `link`.
- `title` is required (non-empty after trim).
- `body` is the markdown body; optional.
- `data` is extra frontmatter (priority, due, tags, etc.). The
  command auto-adds `title`, `type`, `created`, `updated` if not
  provided.

## Behavior

1. Look up `cfg.directories[type]` to find the target directory.
2. Generate slug from title (kebab-case, Unicode-safe, 80-char cap).
3. If the slug file exists, append `-2`, `-3`, … (up to 100).
4. Build frontmatter YAML (with auto-added title/type/created/updated).
5. Acquire a directory-level file lock (`.sb-lock` marker file
   with busy-wait retry; portable across platforms).
6. Write to `.tmp-{pid}-{slug}` then atomic rename.
7. Release the lock.
8. Return the created `Entity`.

## Errors

- `invalid type: <X>` (not in {person, task, project, link})
- `title is required`
- `config: <error>` (cfg lookup failed)
- `no directory configured for type <X>` (cfg missing type mapping)
- `lock <path>: <error>` (couldn't acquire the directory lock after 1s)
- `write/rename <path>: <error>` (file IO error)
- `too many collisions for slug base '<X>'` (101+ files with same name)

## Frontend bridge

`public/app.js` now routes `api.create(body)` through
`invokeOrFetch('vault_create', { entity_type, title, body, data }, ...)`
when in Tauri mode. The Tauri webview can now create entities
without the Node dev server.

## Files

- `src-tauri/src/lib.rs`
  - `vault_create(entity_type, title, body, data)` — main command
  - `slugify(input: &str) -> String` — kebab-case slug generator
  - `chrono_like_now() -> String` — UTC ISO 8601 timestamp without chrono
  - `days_to_ymd(days) -> (i32, u32, u32)` — proleptic Gregorian date math
  - `acquire_dir_lock(dir)` / `release_dir_lock(lock)` — portable file lock
  - 7 new unit tests; 1 new helper test for slugify
  - Tests refactored to use `EnvGuard` (RAII pattern) for env-var isolation
  - All env-var tests now acquire `ENV_LOCK` so the parallel test
    runner doesn't race on the process-wide `SECOND_BRAIN_CONFIG`
- `public/app.js`
  - `api.create(body)` → `invokeOrFetch('vault_create', {...}, ...)`

## Verification

### Rust unit tests (21/21 pass consistently across 5 parallel runs)
- `slugify_basic` — "Hello World" → "hello-world", empty → "untitled",
  Chinese characters preserved
- `vault_create_writes_file` — file is created with correct
  frontmatter and body
- `vault_create_with_extra_data` — custom frontmatter (priority,
  tags) is preserved
- `vault_create_handles_slug_collision` — 3 creates with same title
  produce alice.md, alice-2.md, alice-3.md
- `vault_create_rejects_invalid_type` — "monster" → error
- `vault_create_rejects_empty_title` — "   " → error
- `vault_create_atomic_no_tmp_files_left` — after write, no .tmp-*
  files and no .sb-lock remain in the target directory

### Build
- `cargo check` clean
- `cargo build` produces a 207MB debug binary
- `cargo test --lib` 21/21 pass, deterministic across parallel runs

### Tauri-sim test
- Standard mode: opened the SPA, verified "新建" button still works
  via fetch fallback. No console errors.
- (Tauri-mode end-to-end test deferred to v0.4.7 — requires a real
  Tauri build on hardware. The bridge pattern is the same as the
  already-verified config_get / vault_read / vault_list_all calls.)

## What's not in this issue (filed as v0.4.4.x+ follow-ups)

- `vault_update(id, {data, body})` — overwrite existing entity
- `vault_delete(id)` — soft-delete to trash or hard-delete
- `config_set({...})` — write back to config.json
- `vault_search(query)` — substring match
- `links_import(url)` — fetch + parse + write
- `vault_list_by_type(type)` — narrow `api.list(type)` to Tauri path
- VaultRepo struct to share cfg lookup across commands (avoid
  duplicated `config_get()` calls in each command)

## Lessons

- `std::env::set_var` is **not** thread-safe in Rust 1.78+ (became
  `unsafe`). A mutex serializing the tests is necessary, not just
  nice-to-have. Without it, parallel test runs were 100% flaky on
  the slug collision test (the env value was being observed as a
  different tempdir's path during the test body).
- RAII guards (`EnvGuard` with Drop) eliminate the "panic before
  restore" footgun that the older `let prev = ...; set_var; ...;
  match prev { restore }` pattern was vulnerable to.
- File lock via marker file (`.sb-lock`) is portable across
  platforms — OS-level flock semantics vary (Linux vs Windows vs
  BSD). 50 retries × 20ms = 1s max wait; released on drop.
- Atomic write via tmp + rename is the standard pattern; on POSIX
  rename within the same filesystem is atomic.
