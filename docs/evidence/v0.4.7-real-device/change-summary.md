# v0.4.7 — Real-Device End-to-End Testing + 2 Critical Bug Fixes

## What changed

### Bug fix 1: cockpit's `#main` was being wiped by `renderContent`

**Symptom**: Navigating to `#/tasks` or `#/resources` in cockpit mode crashed:
```
TypeError: Cannot set properties of null (setting 'innerHTML')
    at renderTasks (http://127.0.0.1:3939/app.js:737:20)
    at Object.renderContent (http://127.0.0.1:3939/lib/cockpit.js:1006:71)
```

**Root cause**: `adoptV3Elements` moved `<main id="main">` from `.app` into
`#cockpit-content`. But `renderContent` then did
`content.innerHTML = renderTodayPanel()` which **replaced** all children of
`#cockpit-content` — including the adopted `<main>`. After that,
`$('#main')` returned null and `window.__renderTasks` /
`window.__renderLinks` (which expect `#main` to exist) crashed.

**Fix**: `renderContent` now uses a `renderTarget()` helper that prefers
`#main` (the adopted element) over `#cockpit-content`. The v3 renderers
write into `#main.innerHTML`, and the cockpit's own views (today, schedule,
notes, tags, settings, review) also write into `#main.innerHTML` so the
adoption sticks.

### Bug fix 2: `回顾` sidebar showed `soon` badge despite being implemented

**Symptom**: The `回顾` (review) nav item was implemented in v0.4.c6.回顾
(commit `2c63d5d`) but the sidebar still showed a `soon` badge next to it.
Clicking it worked (route handler was correct) but the badge was misleading.

**Root cause**: The v0.4.c6.回顾 change-summary claimed
"Updated NAV_PRIMARY entry: review impl from 'soon' to 'review'"
but the actual code change was missed — `impl: 'soon'` was left in
`NAV_PRIMARY`. (The route handler at `renderContent` was updated correctly,
which is why clicking still worked, but the badge display logic in
`renderShell` reads from `NAV_PRIMARY.impl`.)

**Fix**: Changed `impl: 'soon'` → `impl: 'review'` for the `回顾` nav entry.

### Test rewrite

- Added `tests/e2e/real-device.mjs` — 18 tests covering standard mode,
  all 9 working cockpit sections, sidebar badge audit, and API contract tests.
- The new test writes results to `window.__testTally` so the caller can read
  them via `playwright-cli eval` (the previous test used `console.log` which
  `playwright-cli run-code` doesn't capture to stdout).
- Updated both `real-device.mjs` and the older `cockpit.mjs` to expect 11
  nav items (6 primary + 5 resources; the c7 test was passing with 10
  only because the test runner wasn't actually surfacing pass/fail counts).

## Verification

### Test results

```
18 passed, 0 failed in 16,516 ms
```

Full test list:
- standard: dashboard renders
- standard: sidebar has 6+ nav items
- cockpit: shell renders
- cockpit: 11 nav items
- cockpit: today has 3 blocks (今日感悟 / 今日成就 / 今日关注)
- cockpit: right rail has 任务与提醒 + 即将到来
- cockpit: bottom row has 3 blocks (捕获的想法 / 收藏与书签 / 记忆回顾)
- notes: 4 type sections (人物 / 任务 / 项目 / 链接)
- tags: tag cloud has chips
- review: has day sections
- schedule: page renders
- settings: form renders
- tasks: page renders (kanban with 4 columns)
- resources: links page renders
- **cockpit: 回顾 nav does NOT have soon badge** (regression)
- API: /api/health ok
- API: /api/dashboard has counts
- API: /api/entities returns object with items

### Screenshots

9 cockpit screenshots in `screenshots/`:
- `01-standard-dashboard.png` — standard v0.3 mode
- `02-cockpit-today.png` — cockpit today panel
- `03-cockpit-notes.png` — 笔记库 grouped list
- `04-cockpit-tags.png` — 标签 tag cloud
- `05-cockpit-review.png` — 回顾 7-day recap (no SOON badge)
- `06-cockpit-schedule.png` — 日程 timeline
- `07-cockpit-settings.png` — 设置 form
- `08-cockpit-tasks.png` — 任务 kanban (post-fix)
- `09-cockpit-resources.png` — 资源库 links grid (post-fix)

### How to run

```
playwright-cli open http://127.0.0.1:3939/
playwright-cli run-code --filename tests/e2e/real-device.mjs
playwright-cli eval "() => JSON.stringify(window.__testTally, null, 2)"
```

## Files

- `public/lib/cockpit.js` (modified)
  - `renderContent` uses `renderTarget()` to prefer `#main` over `#cockpit-content`
  - `adoptV3Elements` retries on each call (was: stuck on first null)
  - `回顾` nav entry `impl: 'soon'` → `impl: 'review'`
- `tests/e2e/real-device.mjs` (new) — 18-test E2E suite with `__testTally` reporting
- `tests/e2e/cockpit.mjs` (modified) — fixed nav-item count from 10 to 11

## .deb package verification

```
$ ar tv "src-tauri/target/release/bundle/deb/Second Brain_0.4.0-alpha_amd64.deb"
rw-r--r-- 1000/1000      4 Jul 13 10:56 2026 debian-binary
rw-r--r-- 1000/1000    582 Jul 13 10:56 2026 control.tar.gz
rw-r--r-- 1000/1000 3096348 Jul 13 10:56 2026 data.tar.gz

$ ar x + tar -tzf data.tar.gz
usr/bin/second-brain         11,405,480 bytes  (the binary)
usr/share/icons/hicolor/32x32/apps/second-brain.png
usr/share/icons/hicolor/128x128/apps/second-brain.png
usr/share/icons/hicolor/256x256@2/apps/second-brain.png
usr/share/applications/second-brain.desktop

$ cat control
Package: second-brain
Version: 0.4.0-alpha
Architecture: amd64
Installed-Size: 11174
Maintainer: lora
Depends: libwebkit2gtk-4.1-0, libgtk-3-0
```

The binary runs without crashing on this dev box (PID alive after 4s).
The WebKit window can't render due to GPU sandbox limitations
("Failed to create GBM buffer of size 1400x900: Invalid argument"),
documented in lessons.md — full UI verification waits for v0.4.7.x on
real hardware.

## Known gaps (filed for follow-up)

- Real Tauri binary test on hardware: the v0.4 Tauri build still hasn't been
  run end-to-end against a real desktop session (only WebKit-rendered
  screenshots via Playwright). Sandbox GPU limitations prevent this in the
  current dev environment. Filed v0.4.7.x.
- Mobile viewport tests not in this round — current viewport is 1280x720
  desktop. Filed v0.4.7.x.
- Interaction tests (click → navigation, form submit → API call) not in
  this round — current tests are smoke tests only. Filed v0.4.7.x.
