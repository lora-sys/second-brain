# v0.5.5 — Agent Tool-Use · Change Summary

## What changed

The cockpit 智能体 page now supports **tool-use**: the agent can perform actions like creating entities or updating task status, not just answer questions.

## Architecture

The agent returns both a text response AND an `actions` array. The UI executes the actions via the existing api client and shows the results inline in the conversation.

```
User prompt ──→ agentComplete(prompt, state)
                  ↓
              { text, actions, provider, model, durationMs }
                  ↓
              bindAgentActions → executeActions(actions)
                  ↓              ↓
              [render text]   api.create / api.update
                                 ↓
                              render action results inline
```

## Supported actions

- **create_task** / **create_person** / **create_project** / **create_link** — entity creation
- **mark_done** — set task status to 'done'
- **update_tags** — replace tags on an entity

## Local-echo patterns

The local-echo provider detects intent via regex and emits corresponding actions:

| User prompt contains | Action emitted |
|---|---|
| `新建.*任务:` or `帮我.*任务: TITLE` | `create_task` with title |
| `标完成` / `完成.*任务` | `mark_done` on most recent open task |

## Layout

After the response text, an "已执行的操作:" section appears with:
- ✓ icon + action type badge + result message
- Green border for success, red for failure

## Implementation

- `public/lib/cockpit.js`
  - `agentComplete()` now returns `actions: []` alongside `text`
  - `bindAgentActions()` executes actions via `executeActions(actions, state)`
  - `executeActions()` — async, calls `api.create()` / `api.update()`, refreshes `state.entities` after mutation
  - `renderActionsHtml()` — renders the inline action results
  - 2 new quick prompts: `新建任务: ...`, `把最新任务标完成`
- `public/style.css` — `.cockpit-agent-action*` (~50 lines)
- `tests/e2e/real-device.mjs` — 1 new test (`agent: tool-use create_task executes action`)

## Verification

### E2E test results

```
46 passed, 0 failed in 31,835 ms
```

### Manual smoke test

1. Click "新建任务: 写 v0.5 release notes" quick prompt
2. Agent response shows: "已创建:写 v0.5 release notes" with green ✓ border
3. Click "把最新任务标完成"
4. Agent response shows: "已标完成:review pilot PR" with green ✓ border

The newly-created task and updated task are immediately visible in the 任务 kanban and dashboard.

### Screenshots

- `screenshots/01-agent-tool-use.png` — full agent page after both tool-use prompts, showing the inline action results

## Tradeoffs

- **Local-echo only supports 2 action patterns** (create_task, mark_done). Real LLM via OpenAI-compatible provider could generate actions via system prompt. Filed v0.5.5.x.
- **Action execution is sequential** — could be parallel for independent actions. Acceptable for v0.5.
- **No confirmation prompt** — clicking "把最新任务标完成" immediately mutates. A confirm dialog would be safer. Filed v0.5.5.x.
- **No undo** — actions are permanent. Could keep an `agent_actions_log` for rollback. Filed v0.5.5.x.

## Privacy

- Tool-use actions use the same api client as manual UI actions — no special network access.
- The action's `payload` is local-only; nothing is sent to any external API.
