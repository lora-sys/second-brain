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

## Tauri commands (v0.4.4)

- **Parallel tests + cwd = race condition** — Rust runs tests in parallel by default. Tests that `set_current_dir` race with each other. Use `$SECOND_BRAIN_CONFIG` (env var, per-test isolated) instead of cwd for config-aware tests.
- **`Path::ends_with('\n')` lost when you `lines().join("\n")`** — `str::lines()` strips line terminators. If you need to preserve a trailing newline, check explicitly: `if raw.ends_with('\n') && !body.ends_with('\n') { body.push('\n'); }`.
- **`PathBuf::from("config.json")` is relative** — comparison with absolute `tempdir.path()` paths fails. Always `canonicalize()` before returning or comparing.
- **Tauri 2.0 custom commands auto-allowed** — you don't need an entry in `capabilities/default.json` for `#[tauri::command]` functions you've registered via `invoke_handler(tauri::generate_handler![...])`. Capabilities only matter for plugins (shell, fs, http, etc.).
- **`serde_yaml = "0.9"` is deprecated upstream** — but it's the only stable release. We use `from_str` (safe) not `from_reader` so the deprecation (which warns about unsafe load methods) doesn't apply to us. Migrate to `serde_yml` when stable.
- **Reimplementing JS logic in Rust duplicates the contract** — write tests that pin the contract, otherwise the two implementations will silently diverge. The 4 `parse_frontmatter_*` tests are the spec for the frontmatter parser; if the JS parser ever changes, those tests need to update.

## Frontend rewire (v0.4.5)

- **Mock the Tauri API in Playwright via `addInitScript`** — instead of launching a real Tauri binary (slow, GPU-bound), inject `window.__TAURI__ = {core: {invoke: async (cmd, args) => {...}}}` before the SPA loads. Capture the call log on `window.__invokeLog` to verify which commands actually got invoked. Fast, deterministic, works in CI.
- **Tauri 2 invoke path: `window.__TAURI__.core.invoke(cmd, args)`** — Tauri 1 uses `window.__TAURI_INVOKE__(cmd, args)`. Probe both shapes.
- **Snake_case vs camelCase is a real cross-language trap** — Rust structs default to snake_case serialization; JS code usually reads camelCase. Add `#[serde(rename_all = "camelCase")]` on every DTO that crosses the JS boundary, or be prepared to translate in JS. The bug only shows up when you actually exercise the bridge end-to-end — a unit test on each side doesn't catch it.
- **Bridge pattern: invoke-or-fetch with shape adapter** — when a single API method might be served by either Rust or fetch (depending on whether we're in Tauri), a wrapper that tries invoke first, falls back on error, and normalizes shape is simpler than two parallel methods. The trade-off is silent fallback on invoke errors; log a warn so dev tools can see.
- **Tauri init script timing matters** — set up the mock BEFORE `goto()`. If you set it after, the SPA has already loaded with `__TAURI__` undefined and the bridge has already decided to use fetch.

## v0.4.c3 (cockpit today panel)

- **js-yaml auto-parses bare ISO timestamps as Date objects** — `due: 2026-07-12` becomes a Date, not a string. Then `.localeCompare` crashes. Always wrap date fields from frontmatter with `String(...)` before string operations, or use a YAML schema that disables timestamp parsing (`yaml.FAILSAFE_SCHEMA`).
- **`await refreshCounts()` blocks the next thing in the chain** — when refreshCounts is in a different domain (slow dashboard fetch, unrelated to current panel's needs), it shouldn't gate render. Fire-and-forget with `.catch()` for logs.
- **Cockpit mode needs its own entity fetch** — standard v0.3 boot doesn't fetch entities on boot (the dashboard panel computes from `state.counts` which is set by /api/dashboard). For cockpit today panel we need state.entities populated immediately, so we fire api.list() and re-render when it arrives.
- **A latent crash in /api/dashboard hid behind test data shape** — the localeCompare bug existed since v0.3 (line 205), but only surfaced when test data had bare-date `due:` fields. Bug-hunting found it via Playwright console errors during the c3 verification.
- **Always run regression check after panel changes** — v0.4.c3 changed renderContent's dashboard branch (replaced __renderDashboard with renderTodayPanel). Could have broken standard v0.3 boot. Tested both modes — standard still works.

## v0.4.4.x (vault_read)

- **Pre-existing test flakiness hides behind parallel runs** — old tests used `set_current_dir` to inject a temp config. Worked serially, failed under parallel cargo test because cwd is process-wide. Use env vars (`$SECOND_BRAIN_CONFIG`) for per-test isolation. Env-var tests compose safely under any thread count.
- **The id format you choose has data-model implications** — `{type}/{slug}` makes the type explicit but requires the consumer to know the type-to-dir mapping. `{dir}/{slug}` is self-describing (file path implied) but requires the consumer to invert cfg.directories. For this codebase, the second is more honest because cfg is the source of truth.
- **Pre-validate enum inputs at the boundary, not in helpers** — putting the `person/task/project/link` check inside parse_id meant parse_id had to know about entity types. Moving the check to vault_read (after cfg lookup) keeps parse_id a pure string-splitter and centralizes type-knowledge where it's actually used.
- **Env-var mutation in Rust tests is process-wide, like cwd** — any test that touches `std::env::set_var` competes with parallel tests. Use a mutex (`static ENV_LOCK: Mutex<()>`) or run with `--test-threads=1`. We tested without the mutex and 14/14 still passed 3x in a row, so the env-var pattern is naturally race-free for our tests (each test sets + restores within microseconds).

## v0.4.4.x+ (vault_create)

- **`std::env::set_var` is not thread-safe in Rust 1.78+** — it's now `unsafe` because the stdlib doesn't synchronize. If you have parallel tests mutating env vars, the *read* side (e.g., `std::env::var` inside the SUT) might see a different value than what your *write* side just put there, depending on which thread the OS scheduled. A mutex around the test is mandatory, not optional. Symptom: `vault_create_handles_slug_collision` was 100% flaky in parallel runs even though each individual test was correct.
- **RAII guards are the right pattern for env-var test isolation** — `let _env = EnvGuard::set("X", val);` restores on Drop, including during panic unwind. Cleaner than the manual `let prev = ...; set_var; ...; match prev { restore }` pattern, which leaks the env var on panic.
- **Filesystem locks across platforms** — `flock(2)` semantics differ between Linux, BSD, and Windows. A marker file (`.sb-lock`) with `O_CREAT | O_EXCL` is portable. Cost: 50 retries × 20ms = 1s max wait. Acceptable for human-driven write paths.
- **Test pass count != test reliability** — 21/21 passing on a single run can mask flakiness. Run the test 5+ times. If it's flaky, you'll see the failures.
- **Custom date math is fine for one shot** — the proleptic Gregorian algorithm is ~30 lines and well-known. If you find yourself writing the third date conversion, pull in `chrono`. Until then, the dep cost isn't worth it.
- **Atomic write pattern is universal** — `write to .tmp-*, rename to final` works on every filesystem that has atomic rename (POSIX guarantees it within a filesystem; on Windows it works if both paths are on the same volume). The cost is one stale `.tmp-*` file per crashed write — easy to clean up in next write or sweep.

## v0.4.4.x++ (vault_update + vault_delete)

- **"Patch" vs "Replace" semantics for vault_update** — read existing → merge → write. The caller doesn't have to send all fields. This is friendlier for the frontend (the entity editor only sends changed fields) and friendlier for the user (no accidental data loss on partial updates).
- **`trash: Option<bool>` is better than `trash: bool` for Tauri commands** — Tauri's serde deserialization treats `None` as missing JSON. `Option<bool>` makes the parameter optional (defaults to `false` via `unwrap_or(false)`). Avoids the caller having to send `trash: false` explicitly.
- **Trash filename pattern** — `<slug>-<iso8601>.md` is sortable, unique, and human-readable. The .md extension is preserved so tools that glob .md files (like our own vault_list_all) don't accidentally try to read trash files as entities. Trash is at `<vault>/.trash/` so it's outside the entity directories — it won't show up in vault_list_all.
- **Test count =/= test reliability** — went from 14 → 21 → 27 tests. Each addition had to keep the parallel-test race fixed. The pattern: ENV_LOCK + EnvGuard + canonicalized path checks. Once that's in place, adding more env-var tests is mechanical.

## v0.4.6 (Tauri build pipeline)

- **`linuxdeploy` has an empty-path bug on Arch** — running it manually produces "ERROR: No such file or directory: " with an empty path. Tauri's AppImage path uses linuxdeploy, so the AppImage bundle fails. The .deb path uses native `cargo-deb` (Debian-specific tooling) and works. Filed as v0.4.6.x. Workaround for the user: ship .deb for now, ship AppImage when linuxdeploy is fixed or replaced (some forks like `linuxdeploy-continuous` may work).
- **Debian package naming with spaces is annoying** — `Second Brain_0.4.0-alpha_amd64.deb` has a space in "Second Brain". Tauri uses the `productName` from tauri.conf.json. Files with spaces in URLs are problematic (URL encoding required). Filed as polish: rename to `second-brain_0.4.0-alpha_amd64.deb` (use `productName` as kebab-case for the artifact name).
- **Tauri 2.0 release builds use webkit2gtk-4.1 by default** — the apt package on ubuntu-22.04 is `libwebkit2gtk-4.1-dev`. Older guides reference 4.0 which is wrong for Tauri 2.
- **Draft release > auto-publish** — for a project that cares about Evidence and quality, the manual review of a draft release is the right gate. Auto-publish is fine for stable, frequent-release projects; we ship maybe 1-2 times per quarter, so the review is cheap.
- **Build pipeline lives in `.github/workflows/release.yml`** — the workflow file is the contract. Anyone can read it to understand "what does shipping look like". The tag-v* + draft-release pattern is the most common shape for small Rust projects.

## v0.4.4.x+++ (vault_search)

- **Relevance scoring is a UX decision disguised as math** — the score formula reflects "what should float to the top". For a personal vault, "exact title match" matters most, then "title substring", then "body match". Getting this wrong (e.g., body matches outranking partial titles) is the difference between "useful search" and "noise". Tune for the user, not for the math.
- **Empty query vs no results are different semantically** — empty query is a programmer error (or UI bug), no results is a normal outcome. Returning an error for one and an empty Vec for the other lets the UI show different messages ("type something" vs "no matches") without string-matching error messages.
- **Reuse `vault_list_all` for search** — even though it's O(N), the same walk already produces the data. Adding a separate walk for search would be a maintenance burden. The optimization (indexed search) is a v0.4.4.x++++ polish.
- **Frontmatter data fields are not searched by default** — that's the right call for v0.4.4.x+++. Users searching for "urgent" expect to find tasks they titled "Urgent task", not tasks tagged urgent. Data fields are structured (status:done, priority:high) and would need a different query syntax (`status:done`) to search semantically. Filed for v0.4.4.x++++.

## v0.4.c5 (cockpit bottom row)

- **"Data hook" panels** — for features that don't exist yet (captures), ship the panel + data hook + empty state. When the feature lands, the panel lights up automatically with no cockpit.js change. Cheaper than a placeholder; better UX than "coming soon".
- **Bookmark = filter, not a new type** — adding a frontmatter flag is much cheaper than adding a new entity type, new CRUD, new Tauri command. The user gets the feature; the codebase stays simple. Reserve new types for genuinely new data shapes.
- **URL parsing in JS is unforgiving** — `new URL(str)` throws on malformed strings. Always wrap in try/catch when the string is user-derived (bookmark URLs especially). The fix is one line; the bug without it is "page doesn't load because cockpit crashed".
- **Standard mode regression is mandatory** — every time we add to cockpit, the standard v0.3 SPA might break. 30 seconds of test prevents an embarrassing "v0.3 broke" PR.
- **8 panels is a lot** — at some point the cockpit becomes overwhelming. v0.4.6 polish: introduce panel collapse, or split the day into "focus" (今日 only) vs "review" (all panels).

## v0.4.4.x++++ (config_set)

- **Per-file vs per-directory lock** — when a file system has multiple "namespaces" (e.g. config file + vault directories), each should have its own lock file. Sharing one lock across namespaces causes contention and unclear ownership. The Rust code now has `acquire_dir_lock` (vault ops) and `acquire_file_lock` (config). Same retry semantics, different lock paths.
- **Patch semantics via Option fields is the Rust idiom for PATCH** — REST PATCH is awkward in statically-typed languages. `struct Update { field: Option<T> }` is the canonical pattern: `None` = unchanged, `Some` = set. Makes invalid states unrepresentable (can't accidentally "send field but not its value").
- **Directories: Some replaces entirely** — even though individual key updates would be more flexible, replacing the whole map is simpler and matches the common case (user renames a directory = sends the new full map). Per-key merge is filed as v0.4.4.x+++++ if the need arises.
- **The pattern of "no cmd test for env-var-touching" is solid** — we now have 38 tests, all touching env vars via EnvGuard + ENV_LOCK, all passing 5/5 parallel runs. Adding the 39th should be mechanical.

## v0.4.6-perf (app.js module split)

- **`window.__*` global namespace works for no-build SPAs** — IIFEs that attach to a single global, consumers destructure. The alternatives (ES modules + bundler, AMD, CommonJS) all require a build step. For a vanilla-JS SPA, globals are the lowest-friction path.
- **Extracted module attachments are order-sensitive** — if api.js loads before bridge.js, `window.__bridge.invokeOrFetch` doesn't exist yet when api.js's IIFE runs. Solution: load dependencies first, dependents after. index.html order matters.
- **Destructuring is the explicit-import substitute** — when you can't write `import { foo } from 'bar.js'`, `const { foo } = window.__bar;` is the equivalent. Makes the dependency visible in the first 5 lines of the consumer.
- **Two-iteration review pattern** — first commit had bare references that broke at runtime; second pass fixed the destructuring. This is normal for refactors. The fix is in the SAME commit (not a follow-up) because the refactor wouldn't work without it. Don't try to ship the broken refactor and "fix in a follow-up" — the broken state is what you'd review, and it's worse than not shipping at all.
- **Small PRs are easier to roll back** — 4 modules in this PR, not 14. If anything breaks, the diff is small enough to spot, revert, or patch in a focused follow-up. The remaining 1880 lines in app.js are still big, but the next split (pages/modals/cockpit-panels) is its own focused PR.

## v0.4.c6-schedule (cockpit section)

- **r#type is Rust syntax, not JS** — when copying a Rust struct field name to JS, the `#` character is invalid. This is a Rust "raw identifier" feature. JS code must use `type` not `r#type`. Caught by `node --check` immediately; always run syntax check after a Rust→JS port.
- **"Hardcoded dashboard" re-render is a silent UX bug** — when an entity pre-load completes, calling `renderContent('dashboard', '#/dashboard')` works for the default route, but silently overrides any other route the user navigated to. The fix is to derive the route from `location.hash` at the moment of re-render. This pattern (re-render with the actual current state, not a stored assumption) applies to any async-init + re-render flow.
- **Three iterations in the same commit is fine when the bug is in the same logical unit** — r#type, routeImplFor exposure, and the hardcoded-dashboard bug were all in the v0.4.c6 schedule feature. Splitting into 3 commits would have made each commit "not functional on its own" (since the schedule section wouldn't render until all 3 fixes are in). The right call is: land the feature + all 3 fixes in one commit, document the iterations in the review report, and move on.
- **`window.__*` pattern made the route bug fix mechanical** — when the entity pre-load needed the route function, I just exposed routeImplFor as `window.__appRouteImpl`. No module import dance, no build step. The 3-min fix in the same commit was possible because the seam was already there.
- **Cockpit pages are 60+ lines of helper + render + CSS** — schedule took ~80 lines of cockpit.js + ~150 lines of CSS. As more sections land (笔记库, 知识图谱, etc.), cockpit.js will balloon. v0.4.6.x filed for further split (schedule-buckets.js, schedule-page.js).

## v0.4.c6.notes (cockpit section pattern reuse)

- **Pattern transfer saves time** — v0.4.c6-schedule established the shape (hero + grouped sections with type-colored borders). v0.4.c6.notes reused it almost verbatim. ~30 min instead of ~2 hours.
- **When a pattern is established, file the next one as a series** — 笔记库, 知识图谱, 回顾, 模板, 智能体 all follow the same template. Could do 4 more in the same week.
- **Escape encoding in Python f-strings is treacherous** — `{` and `}` in Python f-strings conflict with `{` and `}` in JS template literals. The Python string with `{{` (escaped `{`) vs JS string with `{` is brittle. Use sed with explicit patterns when the substitution is single-line.
- **Sidebar shows impl:'soon' as "SOON" badge** — easy to forget. When removing the soon status, also remove the badge. v0.4.6.x filed: add a `if (it.impl === 'soon')` check that ALSO verifies the route is unimpl'd.
'''
git add memory/decisions.md memory/lessons.md && git commit -m "docs: memory updates for v0.4.c6.notes" 2>&1 | tail -3

python3 << 'PYEOF'
with open('PROJECT_STATUS.md', 'r') as f:
    s = f.read()
s = s.replace(
    "| #v0.4.c6.schedule | Cockpit 日程 section (timeline) | Cockpit UI | @coordinator | merged | ✅ Done |",
    "| #v0.4.c6.schedule | Cockpit 日程 section (timeline) | Cockpit UI | @coordinator | merged | ✅ Done |\n| #v0.4.c6.notes | Cockpit 笔记库 section (all entities grouped) | Cockpit UI | @coordinator | merged | ✅ Done |"
)
with open('PROJECT_STATUS.md', 'w') as f:
    f.write(s)
print('updated')
PYEOF
git add PROJECT_STATUS.md && git commit -m "docs: project status update for v0.4.c6.notes" 2>&1 | tail -3
git checkout main && git merge --no-ff feature/v0.4.c6-notes-section -m "merge: feature/v0.4.c6-notes-section (Cockpit 笔记库 grouped list)" 2>&1 | tail -3
git log --oneline -5
## v0.4.4.x++++ (VaultRepo refactor)

- **Marker-based Python replace is brittle for multi-line patterns** — when matching a marker that ends mid-statement, the replacement needs to be a complete statement. Orphaned syntax fragments (like a stray `,`) cause compile errors that the python script can't catch (it's just text manipulation). Sed with explicit patterns is more reliable.
- **Refactor one command at a time, run all tests after each** — vault_list_all was the first refactor (8 lines). All 38 pre-existing tests passed. Then vault_list_by_type was the second (uses the new pattern). 41/41 tests pass 5/5 parallel runs. The refactor is verified by the same tests that protected the old implementation.
- **Compile warnings are not optional** — the "unused import" warning after the refactor was easy to miss (cargo check is silent unless --message-format=short shows the warning line). The fix was trivial (remove the use line) but matters because leaving stale imports is a code-rot signal.
- **Read-only vs write-only abstractions** — VaultRepo is read-only because writes need locks. Don't try to make a "VaultRepo" do everything; the right answer is a trait (`VaultOps`) that has both `read()` and `write(|repo|)` methods. Filed v0.4.4.x+++++ for this.
- **41 tests in <1s** — the test suite is now fast enough to run on every save. The ENV_LOCK + EnvGuard pattern keeps parallel runs deterministic. This is the foundation for adding more tests as the codebase grows.
