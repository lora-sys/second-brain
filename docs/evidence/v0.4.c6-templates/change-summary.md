# v0.4.c6.模板 — Cockpit Templates Section · Change Summary

## What changed

The 模板 (Templates) nav item — previously a `soon` placeholder — now ships with 12 starter templates grouped by entity type.

## Templates shipped (12 total)

### 人物 (Person) — 3 templates
- 同事 (`person-colleague`) — 工作关系,记下职责、Slack、协作历史
- 朋友 (`person-friend`) — 私人关系,什么时候认识、共同回忆
- 家人 (`person-family`) — 家人/亲戚,记生日、爱好、最近的事

### 任务 (Task) — 3 templates
- 默认任务 (`task-default`) — 通用任务,默认 open 状态、中优先级
- 复盘 (`task-retro`) — 事后总结,做得好的/不好的/下次改
- 会议 (`task-meeting`) — 会议纪要,参与者/议题/决议/Action Items

### 项目 (Project) — 3 templates
- 副业项目 (`project-side`) — 个人项目,目标/当前状态/下一步
- 工作项目 (`project-work`) — 工作项目,团队/里程碑/风险
- 研究/探索 (`project-research`) — 研究类,假设/资料/结论

### 链接 (Link) — 3 templates
- 文章 (`link-article`) — 核心观点/我的反应/行动项
- 工具 (`link-tool`) — 用途/试用情况
- 视频 (`link-video`) — 时间戳/笔记

## Layout

- Hero: "12 个模板 · 4 种类型。点模板预览,然后「使用」直接新建 entry"
- 4 type-grouped sections (人物/任务/项目/链接)
- Each card: emoji + name + description + tag chips + body preview (max-height scrollable) + 使用模板 + 复制 body 按钮

## Actions

- **使用模板**: prompts for a title, then calls `api.create()` with the template body + tags, navigates to the new entity detail page
- **复制 body**: copies the template body to the clipboard via `navigator.clipboard.writeText`

## Implementation

- `public/lib/cockpit.js`
  - `TEMPLATES` dict — 12 template definitions, in JS (not vault) so they're available even when the vault is empty
  - `renderTemplates(state)` — full HTML for the page
  - `bindTemplateActions(content)` — wires the 2 buttons per card
  - `findTemplate(id)` / `findTemplateType(id)` — lookup helpers
  - `createFromTemplate(tpl, title)` — async create + navigate
  - `NAV_RESOURCES` 模板 entry `impl: 'soon'` → `impl: 'templates'`
  - New `if (route === 'templates')` branch in `renderContent`
- `public/app.js`
  - `routeImplFor` + `window.__appRouteImpl` updated to map `templates` → `templates`
- `public/style.css`
  - `.cockpit-templates`, `.cockpit-templates-hero`, `.cockpit-template-group`,
    `.cockpit-template-grid`, `.cockpit-template-card`, `.cockpit-template-emoji`,
    `.cockpit-template-name`, `.cockpit-template-desc`, `.cockpit-template-tags`,
    `.cockpit-template-tag`, `.cockpit-template-body`,
    `.cockpit-template-actions`, `.cockpit-templates-empty` (~140 lines)
- `tests/e2e/real-device.mjs`
  - 5 new tests: page renders, hero shows counts, 4 type groups,
    10+ template cards, sidebar has no SOON badge

## Verification

### E2E test results

```
28 passed, 0 failed in 20,027 ms
```

5 new tests for the templates page. All previously-passing tests still pass.

### Screenshots

- `screenshots/01-templates-full.png` — full templates page (1280×1500) showing all 4 groups + 12 cards
- `screenshots/03-templates-viewport.png` — first viewport (1280×720)
- `screenshots/02-v3-standard-regression.png` — standard v3 mode dashboard still renders

### How to verify

```
playwright-cli open
playwright-cli run-code --filename tests/e2e/real-device.mjs
playwright-cli eval "() => JSON.stringify(window.__testTally, null, 2)"
playwright-cli goto http://127.0.0.1:3939/?cockpit=1#/templates
```

## Tradeoffs

- **Templates live in JS, not the vault** — keeps them available even when the vault is empty. Trade-off: can't be edited from Obsidian. Acceptable for v0.4. Filed v0.4.c6.x: vault-backed templates (one template = one markdown file in a special directory).
- **No template editor** — adding/editing templates requires editing the JS. Filed v0.4.c6.x.
- **"使用模板" uses `window.prompt`** — ugly but works. Could be a nicer modal. Filed v0.4.c6.x: dedicated "use template" modal with title + first line of body.
- **12 templates is opinionated** — the user might want different templates. The categories (3 per type) are a reasonable starting set.
