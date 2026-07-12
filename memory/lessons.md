# Lessons Learned

> Things we learned the hard way. Add to this when you discover something non-obvious.

## Build & dev

- **Sandbox blocks binding to ports.** When working under a `workspace-write` sandbox, `node server.mjs` fails with `EPERM`. Need to escalate (`require_escalated`) or run in `danger-full-access`.
- **No network = no `npm install`.** The system has had intermittent network access. We mitigate by symlinking to an existing `node_modules` for dev, but `package.json` lists real deps so a fresh clone can `npm install`.
- **`node_modules` symlinks get committed by mistake.** `.gitignore` must include `node_modules/` AND we must `git rm --cached` if it's already tracked. Symlinks specifically can slip past the pattern.

## Obsidian sync

- **YAML frontmatter is fragile.** Users edit files in Obsidian and may add multi-line strings inside fields, breaking the YAML. The `parseYamlLenient` function salvages this by trying shorter prefixes until parse succeeds. The salvaged content gets merged into the body.
- **Atomic writes only.** Direct writes can corrupt the file on crash. Always `writeFile(tmp); rename(tmp, target)`.
- **Don't bake vault paths into code.** Use `config.json` (gitignored) and let the user set it in the app.

## Frontend

- **Vanilla JS has limits but works.** Without a framework, the v0.3 SPA is 1500 lines of clean code. No build step, no bundler, no deps beyond marked+js-yaml+jsdom.
- **Modules in IIFEs don't share scope.** When extracting `wikilink.js` as a separate file, I forgot to define `escapeHtml` locally — got `ReferenceError` at runtime. Always test cross-module interactions.
- **CSS custom properties + dark mode toggle = free theming.** Three themes (light / dark / sepia) cost ~20 lines of CSS each.

## Process

- **Demo videos are good evidence.** Recording the v0.3 demo with `playwright-cli screencast` produced a 60s webm that's clearer than any screenshot.
- **The user wants to iterate, not be sold.** Don't over-promise. Ship small, get feedback.
- **Adversarial review matters more than I thought.** A second pass catches things I wouldn't.

## Agent apps (v0.4 audit)

- **Agent apps have 2x the surface area.** Every UI feature has an AI counterpart. Every error path has a "what does the AI see" variant. Audit checklist must include AI-error and tool-failure scenarios.
- **Never read a real .env into version control.** Even `diff`-ing a .env file can leak secrets into a tool's log buffer. The harness audit caught a longcat.chat key in the user's .env when running cleanup — fix: exclude `.env` from `diff`, `cat`, and any terminal scrollback before committing. Use `docs/config.example.env` (committed) vs `.env` (git-ignored) discipline strictly.
- **Concurrency primitives belong in `core`, not in app code.** Adding `withFileLock` to `vault.mjs` early (v0.4) prevents an entire class of "two AI sessions corrupted the same file" bugs.
- **LLM adapter interface must be in `core`.** Even before the first real LLM call ships, defining `LlmProvider` + `LocalEchoProvider` (deterministic stub) + `CachedProvider` + `RetryProvider` in `packages/core/src/llm/` means the rest of the app can build against the contract without waiting for OpenAI to be wired.

## Cockpit (v0.4.c1)

- **Re-parenting existing DOM is a valid integration trick** — when you want to overlay a new UI on an existing one without rewriting its render functions, moving the target elements into the new container is cheaper than threading a "renderTarget" parameter through every call site. The cost is DOM-shape coupling, which is acceptable when the underlying renderer isn't going to change soon.
- **MutationObserver is the right tool for mirroring text updates between hidden and visible elements** — `$('#page-title').textContent = ...` from v0.3 stays working, and the cockpit's `#cockpit-title` stays in sync automatically. One observer per overlay instance is fine; just don't forget to disconnect if the overlay is torn down.
- **Always capture async-loaded state AFTER it's loaded** — vault name was captured at renderShell() time, but config loads asynchronously. Either capture lazily (refresher function called from both renderShell and post-load) or wait. The refresher pattern is cleaner.
- **Console-clean + 6 screenshots is a real Evidence pack** — for UI work, the gate is "does the page render without errors and do the key states look right". Don't gate on full E2E when visual inspection is enough.

## Tauri (v0.4.3)

- **`cargo tauri init --ci` produces a working scaffold in seconds** — the non-interactive flags `--app-name`, `--window-title`, `--frontend-dist`, `--dev-url` cover every common case. The init generates 5 stale defaults that need fixing: (1) `app_lib::run()` reference (rename to your lib name), (2) `beforeDevCommand` / `beforeBuildCommand` from npm scripts that don't exist yet, (3) `identifier: "com.tauri.dev"` (collides with Tauri's own dev bundle), (4) `bundle.targets: "all"` (cross-platform tax), (5) no `category` / `description` / `linux.deb.depends`.
- **Sandbox without GPU = WebKit software fallback + blank screenshots** — the GDK logs "Failed to create GBM buffer of size WxH: Invalid argument" and WebKit falls back. Window chrome (title bar, decorations) renders fine; webview content might not paint into `PIL.ImageGrab` screenshots. Mitigation: take screenshots of the desktop showing the window with its title, that's enough evidence the shell works. Full UI verification waits for v0.4.7 on real hardware.
- **Tauri 2.0 capabilities are minimal by design** — `core:default` doesn't include the shell / fs / http plugins. You opt in explicitly. For our use case (no shell, no fs, just our own vault commands), the default capability file needs to enumerate window perms (close, minimize, maximize, toggle-maximize, start-dragging, set-title) because `core:default` alone doesn't include them.
- **WebKit prefers Wayland over X11 by default** — on a system with both, Tauri's first launch may fail with "Error 71 dispatching to Wayland display". Workaround: `GDK_BACKEND=x11 ./second-brain` forces X11. On a real Linux desktop the Wayland path usually works; the sandbox issue is a one-off.
- **`cargo build` cold takes ~30s for ~440 crates** — webkit2gtk-gtk and friends are heavy. After the first build, incremental builds are ~0.5s. The first build is the real cost.
- **`Cargo.lock` should be committed for binaries** — Tauri's `cargo tauri build` produces a deterministic AppImage from a locked Cargo.lock. Don't `.gitignore` it.
