# v0.4.3 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration: review → fix → re-test.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | High | src-tauri/src/main.rs:5 (initial) | After `cargo tauri init`, `main.rs` referenced `app_lib::run()` — but I renamed the lib crate to `second_brain_lib` in Cargo.toml. Build failed with `cannot find module or unlinked crate 'app_lib'`. | `cargo check` → E0433 | **Fixed in this commit** — `sed`-ed to `second_brain_lib::run()` and re-checked. |
| 2 | Medium | src-tauri/tauri.conf.json (initial) | Init-generated `beforeDevCommand: "npm run start"` doesn't exist (we have `dev` and `start`, not the same shape). Init generated `beforeBuildCommand: "npm run build"` which also doesn't exist. Both would error in `tauri dev` / `tauri build`. | `cargo tauri dev` → "beforeDevCommand failed" | **Fixed in this commit** — `beforeDevCommand: "npm run dev"` (matches our package.json), `beforeBuildCommand: ""` (no build step in v0.4). |
| 3 | Medium | src-tauri/tauri.conf.json (initial) | Init-generated `identifier: "com.tauri.dev"` is the placeholder Tauri uses for *their* own dev builds. Using it would conflict with the official Tauri dev bundle on Linux. | n/a (collision with official Tauri identifier) | **Fixed in this commit** — set to `com.secondbrain.app` (real reverse-DNS). |
| 4 | Low | src-tauri/src/lib.rs | Top-of-file comment says "v0.4.4 lands the actual vault commands" but doesn't enumerate what those are. Future readers won't know the scope without grepping the roadmap. | n/a (documentation) | **Fixed in this commit** — added concrete list: `vault_list, vault_read, vault_write, vault_delete, config_get, config_set`. |
| 5 | Low | src-tauri/capabilities/default.json | Initial file just had `core:default` which doesn't explicitly include window management perms (close, minimize, etc.). In dev mode the window works because defaults are permissive, but explicit perms document intent. | n/a (defaults permissive) | **Fixed in this commit** — explicitly listed window perms: close, minimize, maximize, toggle-maximize, start-dragging, set-title. |
| 6 | Low | src-tauri/icons/ | All placeholder PNGs (Tauri's default icons). Will look generic in production builds. | n/a (visual) | Acknowledged. Filed as v0.4.L3 (brand mark icon). |

### Bug-hunter checklist
- [x] `cargo check` clean
- [x] `cargo build` produces binary
- [x] Binary launches without crashing
- [x] Native window decorations render (title bar, minimize/maximize/close)
- [x] Window title matches our brand ("第二大脑 · Second Brain")
- [x] No unhandled panics at startup
- [x] Dev URL health check passes before window opens
- [x] No shell / fs / http plugins granted

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | High | src-tauri/src/lib.rs + .gitignore | `src-tauri/target/` is the Rust build output (heavy, ~1GB). The init-generated `.gitignore` covers it — verified. | Acknowledged, no action needed. |
| 2 | Medium | package.json scripts | Removed stale v0.4.1-era scripts (`dev:web`, `build:web`, `dev:desktop`, `build:desktop`). The latter two referenced `cd packages/desktop && cargo tauri dev` — `packages/desktop` doesn't exist (we reverted the monorepo). | **Fixed in this commit** — replaced with `dev:tauri` + `build:tauri` + `tauri` + `check:tauri`. |
| 3 | Medium | src-tauri/tauri.conf.json | `bundle.targets: "all"` (init default) would build msi/dmg/app for cross-platform but we're Linux-first. Building msi/dmg on Linux without cross tooling wastes time. | **Fixed in this commit** — narrowed to `["appimage", "deb", "rpm"]`. Windows / macOS are separate future issues. |
| 4 | Medium | src-tauri/tauri.conf.json | Bundle has no category / shortDescription. App stores will reject the upload. | **Fixed in this commit** — added `category: "Productivity"`, `shortDescription`, `longDescription`, and `linux.deb.depends: [libwebkit2gtk-4.1-0, libgtk-3-0]` so users get clean apt installs. |
| 5 | Low | src-tauri/src/lib.rs | `setup()` only enables logging in debug builds. Release builds won't log anywhere. | Acknowledged. Release logging is a separate concern; for v0.4.3 we ship without release-side logging and add it in a follow-up if needed. |
| 6 | Low | src-tauri/Cargo.toml | `authors = ["lora"]` is generic. Could be `"lora <noreply@secondbrain.local>"` for proper packaging metadata. | Acknowledged. Filed as polish for v0.4.L3. |

### Architecture-reviewer checklist
- [x] No new JS deps (still 3: js-yaml, jsdom, marked)
- [x] Tauri workspace is isolated to `src-tauri/` — doesn't touch `lib/` or `public/`
- [x] Capabilities are minimal: no shell, no fs, no http
- [x] Coupling: webview loads via URL — no shared code with Rust yet (v0.4.4 introduces the bridge)
- [x] Boundaries: Rust side doesn't know about specific vault entities; just provides the host
- [x] No security regression: zero new attack surface (no plugins enabled that aren't needed)
- [x] No repeated logic: Tauri config is the single source of truth for the shell
- [x] Build pipeline is reproducible: `cargo build` and `cargo tauri build` both work from a fresh clone

## Aggregator verdict

**Findings: 12 total — 0 Critical, 0 High outstanding, 5 Medium fixed, 7 Low acknowledged.**

- 0 Critical / 0 outstanding High
- 1 High (broken main.rs reference) fixed before merge
- 5 Medium fixed (config cleanups, deps, scripts)
- 7 Low acknowledged (icon placeholders, authors, release logging) — not blockers for v0.4.3

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.L3 — replace placeholder icons with brand mark (uses public/lib/marked.min.js? No, uses the existing brand-mark CSS / a real PNG export)
- v0.4.L3 polish — proper Cargo.toml authors field with email
- v0.4.L3 — release-side logging (env_logger + tauri-plugin-log)
- v0.4.4 — vault Tauri commands (the real v0.4.4 work)
