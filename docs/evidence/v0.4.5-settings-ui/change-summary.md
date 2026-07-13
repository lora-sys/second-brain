# v0.4.5 — Cockpit Settings UI · Change Summary

## What changed

The cockpit sidebar now has a "设置" (Settings) nav item that opens
a real settings page. The page lets the user edit vaultPath / port /
host and saves via `config_set` (Tauri) or `PUT /api/config` (browser).

## Layout

- 设置 hero: "修改 Vault 路径、监听端口和地址。保存后需要重启服务才能生效。"
- Vault 路径 input (pre-filled with current value)
- 监听端口 number input
- 监听地址 text input
- directories display: read-only list of { type → path } pairs
  (e.g., person → 10-People, task → 20-Tasks, etc.)
- 保存 button (primary) — submits the form
- 重载 button — re-fetches from server and re-renders

## Behavior

- Form pre-fills with current values from `state.config`
- Submit calls `api.config.put(body)` with non-empty fields only
- Tauri mode: invokes `config_set` → writes via per-file lock
- Browser mode: PUTs `/api/config` → writes via Node server
- On success, `state.config` is updated and a success toast appears
- After save, port/host changes need a server restart to take effect
  (the running Tauri app keeps using the old listener)

## Files

- `public/lib/cockpit.js`
  - Added `renderSettings(state)` — form HTML
  - Added `renderDirsDisplay(dirs)` — type → path list
  - Added `bindSettingsForm(content)` — form submit + reload handlers
  - Added `if (route === 'settings')` branch in `renderContent`
  - Added nav item: `{ hash: '#/settings', label: '设置', icon: 'settings', impl: 'settings' }`
- `public/app.js`
  - Updated both `routeImplFor` and `window.__appRouteImpl` to return
    'settings' for the settings route (fixed a duplicate-line bug
    during this round)
- `public/style.css`
  - ~80 lines: `.cockpit-settings`, `.cockpit-settings-hero`,
    `.cockpit-settings-form`, `.cockpit-settings-row`,
    `.cockpit-settings-dirs`, `.cockpit-settings-actions`

## Verification

### Visual
- 设置 nav item appears in the cockpit sidebar
- Clicking it opens the settings page
- Form pre-fills with current values (vaultPath, port, host)
- directories display shows the type→path mapping

### Console
- 0 errors, 0 warnings

Screenshots:
- `01-settings-page.png` — full settings page with form pre-filled

## Decisions made

### Tauri mode = invoke, browser mode = PUT
- The form submit goes through `api.config.put(body)` which is already
  wired to the bridge: Tauri → `config_set` invoke, browser → PUT
  fetch. No new Tauri command needed.

### "保存后需要重启服务才能生效" warning
- Tauri and the browser Node server keep the old socket bound.
  Restart needed for new port/host to take effect.
- Filed v0.4.5.x: add an "auto-restart" button that signals the user
  to quit and relaunch (Tauri can spawn a new process; browser
  would need a daemon).

### directories display is read-only
- User can SEE the current directory mapping (person → 10-People,
  etc.) but can't change it from the UI. This is intentional: editing
  the directory mapping requires a restart anyway, and most users
  don't need to change it.
- Filed v0.4.5.x: add inline editing for directories in a future
  "advanced" view.

### No async confirmation toast helper
- The form submit calls `window.__appToast(...)` if it exists. The
  v0.3 SPA's toast function is wrapped in an IIFE, so it's not on
  window. Filed v0.4.5.x: expose toast on window for cross-module
  use.

## What's not in this issue (filed as v0.4.5.x)

- v0.4.5.x — auto-restart button after config change
- v0.4.5.x — inline editing for directories mapping
- v0.4.5.x — expose window.__appToast
- v0.4.5.x — directory change helper (move existing entries)
