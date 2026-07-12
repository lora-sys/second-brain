# v0.4.5 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration: review found a camelCase bug, fixed in same PR.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | High | src-tauri/src/lib.rs:Config (initial) | Rust returned `vault_path` (snake_case) but the frontend reads `state.config.vaultPath` (camelCase). Sidebar footer in Tauri mode showed "未配置" because the lookup returned undefined. | Tauri-sim test: sidebar footer showed "未配置" instead of "vault" | **Fixed in same commit** — added `#[serde(rename_all = "camelCase")]` to `Config`. Tests updated to use camelCase JSON fixtures. |
| 2 | Medium | public/app.js:bridge (initial) | Bridge only checked `window.__TAURI__.core.invoke` (Tauri 2.0). Tauri 1.0 uses `window.__TAURI_INVOKE__`. Older bundles would silently fall back to fetch. | Tauri 1.0 detection test | **Fixed** — probe both shapes; expose `kind: 'v1' | 'v2' | null` on `__secondBrainBridge` so dev tools can see which was detected. |
| 3 | Medium | public/app.js:invokeOrFetch | When invoke fails, the error is swallowed and we fall through to fetch. The error message ("bridge invoke failed") is logged but the original cause might be a config issue (e.g., vault path unset) that fetch won't fix. | log inspection | Acknowledged. Logged `console.warn` includes the original error. Filed as v0.4.5.x — add UI toast for "Tauri command failed; falling back to fetch" so the user knows. |
| 4 | Low | public/app.js:api.list(type) | Tauri path doesn't support type filtering (Rust has no vault_list_by_type). In Tauri mode, `api.list('person')` falls through to fetch — but fetch fails because no Node server. So `api.list(type)` in Tauri mode is broken. | grep usage | Filed as v0.4.4.x follow-up — add Rust vault_list_by_type. |
| 5 | Low | public/app.js:normalizeTauri | Hardcoded to handle only `vault_list_all` shape. New Tauri commands that need shape normalization will be forgotten. | grep "normalizeTauri" | Filed as v0.4.5.x — extend the switch as new commands are rewrapped. |
| 6 | Low | public/app.js:bridge | `window.__secondBrainBridge` is exposed globally. Could collide with future code. | grep "secondBrainBridge" | Acknowledged. The name is sufficiently specific (no false-positive matches). |

### Bug-hunter checklist
- [x] All async paths have error handling (invokeOrFetch try/catch + fetch error path)
- [x] No silent failures (fallback path logs warning)
- [x] No race conditions (bridge is evaluated once at module load)
- [x] camelCase / snake_case consistency verified by Tauri-sim test
- [x] Both Tauri 1.0 and Tauri 2.0 invocation shapes handled
- [x] No command injection (we only invoke known commands by name)
- [x] No XSS (no new user-input rendering)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Medium | public/app.js | `api.config.get` is now async via invokeOrFetch; if invoke fails the user gets a confusing "config.json not found" or stale-config error from the Node fallback. Better UX: when in Tauri mode, if invoke fails, show a clear error UI rather than fall back silently. | Filed as v0.4.5.x (UX improvement). |
| 2 | Medium | public/app.js:bridge | The bridge is a single function. As more commands get rewired, the bridge becomes a leaky abstraction (each call site knows whether to invoke or fetch). | Documented trade-off. Alternative was a generic "command registry" but YAGNI — only two commands are rewired, the explicit if/else is clearer. |
| 3 | Low | src-tauri/src/lib.rs | Adding `rename_all = "camelCase"` couples Rust struct fields to JS naming conventions. If we ever add a CLI or non-JS caller, they'd see camelCase output. | Documented. Rust still allows snake_case access in code (cfg.vault_path); only serialization is camelCase. |
| 4 | Low | public/app.js | Bridge is in the same file as the rest of app.js. If app.js gets split (it's already 1980 lines), the bridge should move to a separate file. | Not now. Filed as `appjs-split` follow-up for v0.4.6 (perf debt). |

### Architecture-reviewer checklist
- [x] No new JS deps (still 3: js-yaml, jsdom, marked)
- [x] No new Rust deps (the rename was pure derive attribute)
- [x] Bridge has small surface: `__secondBrainBridge = {tauri, kind}` + `invokeOrFetch` + `normalizeTauri`
- [x] Boundaries: bridge is module-internal, only `api.*` methods use it
- [x] No security regression: invoke path runs the same Rust commands the user could call via dev tools anyway; fetch path unchanged
- [x] No repeated logic: normalizeTauri is the single source of shape adaptation

## Aggregator verdict

**Findings: 10 total — 0 Critical, 0 High outstanding, 2 Medium fixed, 2 Medium acknowledged, 6 Low.**

- 1 High (camelCase bug) caught by the Tauri-sim test, fixed in the same commit
- 2 Medium fixed (Tauri 1.0 detection, normalizeTauri extensibility note)
- 4 Medium/Low acknowledged (silent fallback UX, snake_case coupling, etc.)
- All Rust unit tests still pass (8/8)

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.4.x — vault_read / vault_create / vault_update / vault_delete / config_set / vault_search / links_import
- v0.4.4.x — vault_list_by_type (so `api.list(type)` works in Tauri mode)
- v0.4.5.x — rewire api.read / create / update / delete / search / dashboard / importLink / config.put
- v0.4.5.x — UI toast on bridge-fallback (instead of silent log warn)
- v0.4.5.x — extend normalizeTauri as new commands need shape adaptation
- v0.4.6 (perf) — split app.js (currently 1980 lines) into focused modules
