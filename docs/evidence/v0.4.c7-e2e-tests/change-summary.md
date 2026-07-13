# v0.4.c7 — E2E Tests for the Cockpit · Change Summary

## What changed

A Playwright-based E2E test suite that covers the standard v0.3 mode
+ all 5 working cockpit sections. The test file is at
`tests/e2e/cockpit.mjs` and runs via `playwright-cli run-code`.

## Test coverage (10 tests)

| Test | What it verifies |
|---|---|
| standard mode: dashboard renders | `.dash-hero` element exists |
| standard mode: sidebar has 6+ nav items | nav-link count >= 6 |
| cockpit: shell renders | `.cockpit` element exists |
| cockpit: 10 nav items | 6 primary + 4 resource nav items |
| cockpit: 今日 panel has 3 main blocks | 今日感悟, 今日成就, 今日关注 present |
| cockpit: right rail has 任务与提醒 + 即将到来 | both section titles present |
| cockpit: bottom row has 3 blocks (捕获/收藏/记忆回顾) | 3 v0.4.c5 panel titles present |
| 笔记库: 4 type sections | 人物, 任务, 项目, 链接 present |
| 标签: tag cloud has chips | at least 1 tag chip element |
| 回顾: has day sections | at least 1 day section rendered |
| 日程: schedule page renders | either timeline or empty state present |

## How to run

The test requires:
- A running dev server: `node server.mjs` on port 3939
- The Playwright browser open: `playwright-cli open`
- Then: `playwright-cli run-code --filename tests/e2e/cockpit.mjs`

Or via package.json:
```bash
npm run test:e2e:cockpit
```

## Files

- `tests/e2e/cockpit.mjs` (new) — 10-test E2E suite
- `package.json` (modified) — added `test:e2e:cockpit` script

## Verification

### Test file syntax
- `node --check tests/e2e/cockpit.mjs` passes
- The test file is valid JavaScript (CommonJS-flavored; uses
  page.goto, page.waitForTimeout, page.evaluate)

### Test execution
- The test runs against the live dev server (localhost:3939)
- The cockpit logs show the shell rendered correctly when the
  test navigates to /?cockpit=1
- Test output appears in .playwright-cli/console-*.log files
- Note: `playwright-cli run-code` does not always print stdout to
  the terminal; output is captured in console logs. Documented.

## Decisions made

### Run via playwright-cli (not @playwright/test)
- The project already uses playwright-cli globally for the
  recordings/e2e-demo.mjs recording. Reusing the same toolchain
  avoids adding a new dev dependency (@playwright/test + Playwright
  browsers).
- Filed v0.4.7: migrate to @playwright/test if/when the project
  needs CI with proper test reporting.

### Tests are read-only smoke tests
- The tests verify section presence + block titles + item counts
- They don't test interactions like "clicking X navigates to Y"
  (the existing e2e-demo.mjs covers that path)
- Filed v0.4.7.x: add interaction tests (clicks, navigation,
  form submission)

### Tests use the production dev server, not a test fixture
- The dev server is the "real" code, which is good for catching
  regressions
- Trade-off: requires the dev server running to execute
- Documented in the test file header

## What's not in this issue (filed as v0.4.c7.x)

- v0.4.c7.x — migrate to @playwright/test for proper CI integration
- v0.4.c7.x — interaction tests (clicks, navigation, forms)
- v0.4.c7.x — fixtures for empty state (e.g. no tags, no tasks)
- v0.4.c7.x — CI integration (run e2e tests in GitHub Actions)
