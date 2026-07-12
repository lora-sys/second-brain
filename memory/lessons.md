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
