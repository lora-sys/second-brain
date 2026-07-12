# v0.4.5 — Frontend Rewire · Change Summary

## What changed

Frontend `public/app.js` can now run inside the Tauri webview and route
calls to the Rust commands added in v0.4.4. The same code still works
in a plain browser (falls back to `fetch()` against the Node HTTP
server).

### New bridge in `public/app.js`

```js
const tauri = (() => {
  if (window.__TAURI__?.core?.invoke) return { kind: 'v2', invoke: ...invoke };
  if (typeof window.__TAURI_INVOKE__ === 'function') return { kind: 'v1', invoke: ... };
  return null;
})();

async function invokeOrFetch(cmd, args, fetchPath, fetchOpts) {
  if (tauri) {
    try { return normalizeTauri(cmd, await tauri.invoke(cmd, args || {})); }
    catch (err) { /* fall through to fetch */ }
  }
  return fetch(fetchPath, ...); // existing behavior
}

function normalizeTauri(cmd, data) {
  // Rust vault_list_all returns Vec<Entity> directly; JS expects {items: [...]}.
  if (cmd === 'vault_list_all') return { items: data || [] };
  return data;
}
```

`window.__secondBrainBridge = { tauri, kind }` exposed for dev introspection.

### Rewired methods

| Method | Tauri path | Browser path |
|---|---|---|
| `api.config.get()` | `invoke('config_get', {})` | `fetch('/api/config')` |
| `api.list()` (no type) | `invoke('vault_list_all', {})` → wrap in `{items}` | `fetch('/api/entities')` |
| `api.list(type)` | still uses `fetch` (Rust has no `vault_list_by_type` yet) | `fetch('/api/entities?type=X')` |

All other methods (`read`, `create`, `update`, `delete`, `search`,
`dashboard`, `importLink`) keep their existing `fetch` paths — they
have no Rust counterpart yet. v0.4.4.x follow-ups will add the missing
Rust commands; v0.4.5.x follow-ups will rewire those.

### Rust change (driven by v0.4.5)

`Config` struct now has `#[serde(rename_all = "camelCase")]`. This was a
bug in v0.4.4: Rust returned `vault_path` (snake_case) but the frontend
reads `state.config.vaultPath` (camelCase). With this fix the JS
side gets the fields it expects. Tests updated to write
`{"vaultPath": "..."}` instead of `{"vault_path": "..."}`.

## Verification

### Browser mode (no Tauri)
- `playwright-cli open http://127.0.0.1:3939/` → SPA loads, dashboard
  renders with real vault data, 0 console errors.
- `window.__secondBrainBridge = {tauri: false, kind: null}` — correctly
  detects the absence of Tauri.
- Screenshot: `screenshots/01-browser-mode-fetch.png`

### Tauri-simulated mode (mocked __TAURI__)
A Node script (`/tmp/tauri-sim-test.js`) injects a mock `window.__TAURI__`
that simulates the Rust commands' responses, then loads the SPA.

```
BRIDGE: {"tauri":true,"kind":"v2"}
INVOKE_LOG: [
  { "cmd": "config_get", "args": {} }
]
```

The frontend:
1. Detects Tauri context → `__secondBrainBridge.tauri === true`
2. Routes `api.config.get()` through `tauri.invoke('config_get', {})`
3. Receives the mock Config object (with camelCase `vaultPath`)
4. Updates `state.config` → sidebar footer shows "vault" (last path
   segment of mock path `/mock/vault`), not "未配置"

Screenshot: `screenshots/02-tauri-sim-mode-invoke.png`

### Rust unit tests (8/8 pass)
- All 8 v0.4.4 tests still pass after the `rename_all = "camelCase"`
  change.
- Test JSON fixtures updated from `vault_path` to `vaultPath`.

## What's not in this issue (filed as v0.4.5.x follow-ups)

- Rewire `api.read(id)` → `invoke('vault_read', {id})` once Rust lands that
- Rewire `api.create / update / delete` → invoke once Rust lands those
- Rewire `api.search(q)` → `invoke('vault_search', {q})`
- Rewire `api.dashboard()` → `invoke('vault_dashboard', {})` (or split into
  separate commands for counts, dueTasks, recent, tags)
- Rewire `api.importLink(body)` → `invoke('links_import', {url})`
- Rewire `api.config.put(body)` → `invoke('config_set', body)`
- Filter support: Rust vault_list_all returns everything; we need
  vault_list_by_type for the `api.list(type)` path. Until then,
  `api.list(type)` always falls back to fetch in Tauri mode.

## Notes for the next round

- The Tauri-sim test proves the bridge works with the real v0.4.4
  contracts. End-to-end through a real Tauri binary is verified in
  v0.4.7.
- We don't yet ship a Node sidecar, so the v0.4.5 release-mode Tauri app
  can do vault config + entity list (read-only) but cannot yet mutate
  the vault. v0.4.4.x closes that gap.
