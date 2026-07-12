# Backend

## Stack (v0.3, transitional)

- Node.js vanilla HTTP server at `server.mjs`
- 3 deps: js-yaml, jsdom, marked

## Stack (v0.4, target)

- Tauri 2.0 shell with Rust commands
- Existing Node HTTP server becomes optional (web showcase only)
- Commands live in `src-tauri/src/commands/*.rs`

## Command Catalog (v0.4 target)

```
vault_list(type: Option<String>) → Vec<EntitySummary>
vault_read(id: String) → Entity
vault_create(type: String, data: Value, body: String) → Entity
vault_update(id: String, data: Value, body: String) → Entity
vault_delete(id: String) → { ok: bool }
config_get() → Config
config_set(config: Config) → Config
event_emit(event: Value) → { id: String }
event_list(since: Option<String>, limit: Option<i32>) → Vec<Event>
link_import(url: String, deep: bool) → Entity
link_fetch_light(url: String) → LinkMeta
search(q: String) → Vec<EntitySummary>
dashboard() → Dashboard
```

Each command is:
- Whitelisted in `tauri.conf.json` capabilities
- Validates input via serde
- Returns Result<T, AppError> → Result<T, String> in JS
- Logs to stderr for observability
- Never blocks the main thread (uses tokio)

## Error handling

- All Tauri commands return `Result<T, AppError>`.
- Frontend catches and shows toasts.
- No silent failures. Every error path has a user-visible message.
- UncaughtException handler in Node (v0.3) for backwards compat.
