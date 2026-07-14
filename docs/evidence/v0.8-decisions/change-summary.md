# v0.8 — Decision Journal · Change Summary

## What changed

The Second Brain now supports a **Decision Journal**: a structured way to record important decisions and revisit them later for retrospective.

## Schema (per decision)

- `title` — short label
- `context` — why the decision was needed
- `options` — what was considered
- `decision` — what was chosen and why
- `status` — `pending` / `reviewed`
- `retrospective` — what happened, was it right?
- `retrospectiveAt` — when the retrospective was added
- `outcome` — `good` / `neutral` / `bad`
- `madeAt` — when the decision was made
- `tags` — tags

## Implementation

### Backend

- `lib/vault.mjs` — added `'decision'` to TYPES
- `lib/server.mjs`
  - Added `'decision'` to ENTITY_TYPES
  - `sanitizeData` defaults `status: 'pending'` and `madeAt: <now>` for decisions
- `config.json` — added `decision: 50-Decisions` directory mapping
- `vault/50-Decisions/` — new directory for decision files

### Frontend

- `public/lib/cockpit.js`
  - `renderDecisions(state)` — 4 status cards + list of decisions sorted by `madeAt`
  - Each card shows: title, status badge, age (今天 / N 天前), context preview, retrospective (if exists)
  - Pending decisions older than 30 days show ⏰ "需要回顾" warning
  - "添加回顾" button on each pending/old decision → opens retrospective modal
  - `openDecisionModal()` — form to create a new decision (title, context, options, decision, tags)
  - `openRetrospectiveModal(decisionId)` — form to record retrospective (text + outcome)
- `public/lib/state.js` — added `decision: []` to initial state
- `public/lib/cockpit.js` — agent actions refresh now includes `decision` bucket
- `public/app.js`
  - `Promise.all` in dashboard pre-load now fetches `api.list('decision')`
  - `preloadAllEntities` includes decisions
  - BootCockpit's pre-load bucket includes `decision: []`
- `public/style.css` — age badge, needs-review indicator, review button alignment

### Tests

- `tests/e2e/real-device.mjs` — 4 new tests
  - decisions page renders
  - 4 status cards
  - new decision button
  - API: POST /api/entities accepts decision type

## Verification

### E2E test results

```
72 passed, 0 failed in 43,519 ms
```

### Manual smoke test

```bash
# Create decision
$ curl -X POST http://127.0.0.1:3939/api/entities -d '{
    "type": "decision",
    "title": "v0.4 用 Tauri 而不是 Electron",
    "data": {"status": "pending", "context": "需要把 web SPA 变成桌面 app", "decision": "Tauri"}
  }'
→ { id: "50-Decisions/v0-4-...", status: "pending", madeAt: "2026-07-14T08:06:18Z" }

# Add retrospective
$ curl -X PUT http://127.0.0.1:3939/api/entities/50-Decisions/... -d '{
    "data": {"status": "reviewed", "retrospective": "走对了", "outcome": "good"}
  }'
→ status: "reviewed"
```

In the cockpit: pending decision shows orange PENDING badge + age + 添加回顾 button. Reviewed decisions show green REVIEWED + retrospective preview.

### Screenshots

- `screenshots/01-decisions-page.png` — initial view with 1 decision
- `screenshots/02-decisions-with-age.png` — with age badge ("今天") and 添加回顾 button

## Tradeoffs

- **No automatic retrospective prompt** — currently user has to click 添加回顾 manually. Could add a weekly reminder. Filed v0.8.x.
- **No "outcome" UI in card list** — outcome is stored but not shown. Could add icon: ✓/~ /✗. Filed v0.8.x.
- **No decision-detail page in cockpit** — clicking goes to standard v3 entity detail. Could build a custom renderer that emphasizes the retrospective section. Filed v0.8.x.
- **No decision ↔ task link** — decisions don't link to the tasks they spawned. Could add `linkedTasks: [id, id]`. Filed v0.8.x.

## Privacy

- All data stays in the vault under `50-Decisions/`. No external API calls.
- Decisions are personal reflections. No telemetry.
