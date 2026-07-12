# Testing

> Test strategy + Evidence format. Read this before opening a PR.

## Layers

| Layer | Tool | When |
|---|---|---|
| Unit | (TBD per module) | When logic is non-trivial |
| Integration | Node `node --check` for syntax; manual API tests | After every change |
| E2E | Playwright via `playwright-cli` | Before every release |
| Visual | Playwright screenshots → `docs/evidence/<id>/screenshots/` | Before every UI release |
| Tauri (v0.4+) | Rust unit tests + integration | After every Rust change |
| AI (v0.5+) | Prompt snapshot tests, deterministic seeds | After every prompt change |

## Evidence format

Per Issue, create `docs/evidence/<id>/`:

```
docs/evidence/<id>/
├── change-summary.md     # what changed, why
├── test-results/
│   ├── playwright.json
│   └── console.log        # must be clean
├── screenshots/
│   ├── desktop.png
│   ├── mobile.png
│   └── (other states)
├── review-report.md      # all 3 reviewers
└── implementation-plan.md  # written at planning time
```

## Definition of Done (test side)

- [ ] `node --check` passes on all `.mjs` files
- [ ] `npm run check` passes
- [ ] Playwright e2e for any user-facing change
- [ ] Console clean (no errors / warnings)
- [ ] No unhandled promise rejections in server log
- [ ] Screenshots at desktop + mobile + key states
- [ ] All 3 reviewer reports attached (or noted as N/A)

## Test scenarios (smoke)

- Create / read / update / delete each of 4 entity types
- Wikilink autocomplete in editor (`[[` → popup → insert)
- Smart mentions in rendered body
- Kanban drag-and-drop
- Tag filter AND logic
- Theme switch (light / dark / sepia)
- Mobile responsive (390px viewport)
- All routes navigable (dashboard / people / tasks / projects / links / settings)

## Playwright CLI workflow

```bash
# Open a session
playwright-cli open about:blank
playwright-cli resize 1366 820

# Navigate
playwright-cli goto http://127.0.0.1:3939/#/dashboard

# Take screenshot
playwright-cli --raw screenshot --filename=/tmp/foo.png

# Run a script
playwright-cli --raw run-code --filename=tests/foo.mjs

# Close
playwright-cli close
```

## Continuous testing (TBD)

- GitHub Actions: `lint.yml` (eslint / prettier if added), `test.yml` (npm run check + e2e), `build.yml` (Tauri build), `docs-index.yml` (refresh docs/.index).
