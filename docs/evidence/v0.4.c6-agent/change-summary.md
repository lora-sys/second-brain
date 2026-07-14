# v0.4.c6.智能体 — Cockpit Agent Section · Change Summary

## What changed

The 智能体 (Agent) nav item — the LAST `soon` placeholder — now ships as a working local-echo agent. With this, **all 12 cockpit sidebar items have real implementations**.

## Layout

- Hero: "本地-echo 模式,无需 API key。v0.5 会接 Ollama / OpenAI。"
- 4 status cards: Provider / Model / Status / 隐私
  - `local-echo` · `deterministic-stub` · `● 在线` · `本地运行 · 数据不出本机`
- Conversation log (max-height 480px, scrollable)
  - User messages: right-aligned, accent-tinted
  - Assistant messages: left-aligned, neutral
  - Each assistant response has metadata footer: `provider · model · duration`
- Composer: textarea + 5 quick-prompt chips + send button
  - Cmd/Ctrl+Enter sends
  - Quick prompts: 总结最近的活动 / 我有哪些未完成任务? / 我的朋友列表 / 最常用的标签 / 活跃的项目

## Local-echo responses (5 patterns)

The agentComplete function matches prompt keywords and returns deterministic responses derived from the actual vault state:

1. **最近/总结** — counts updates in the last 7 days, by type, with most-recent title
2. **任务/open/todo** — lists tasks with status='open' or no status
3. **朋友/friend/人物** — lists people tagged 'friend'
4. **标签/tag** — top 8 tags by usage
5. **项目/活跃/active** — projects with status='active' or no status
6. **hello/hi/你好** — greeting
7. **default** — vault entity counts

## Implementation

- `public/lib/cockpit.js`
  - `AGENT_QUICK_PROMPTS` (5 prompts)
  - `agentComplete(prompt, state)` — keyword-matched local-echo provider
  - `renderAgent(state)` — full HTML
  - `bindAgentActions(content, state)` — wires send button, quick prompts, Cmd/Ctrl+Enter
  - `NAV_RESOURCES` 智能体 entry `impl: 'soon'` → `impl: 'agent'`
  - New `if (route === 'agent')` branch in `renderContent`
- `public/app.js`
  - `routeImplFor` + `window.__appRouteImpl` updated for `agent`
- `public/style.css`
  - `.cockpit-agent`, `.cockpit-agent-hero`, `.cockpit-agent-status-grid`,
    `.cockpit-agent-status-card`, `.cockpit-agent-status-online`,
    `.cockpit-agent-conversation`, `.cockpit-agent-empty`,
    `.cockpit-agent-msg` + user/assistant variants,
    `.cockpit-agent-thinking`, `.cockpit-agent-response-text`,
    `.cockpit-agent-response-meta`, `.cockpit-agent-composer`,
    `.cockpit-agent-quick-prompts`, `.cockpit-agent-quick-btn` (~180 lines)
- `tests/e2e/real-device.mjs`
  - 6 new tests: page renders, status cards present, composer + 5 quick prompts,
    clicking a quick prompt produces assistant reply, sidebar has no SOON badge,
    **NO soon badges remain anywhere in sidebar** (the milestone test).

## Verification

### E2E test results

```
34 passed, 0 failed in 21,671 ms
```

6 new tests. All previously-passing tests still pass. The "no soon badges" test confirms the cockpit is feature-complete.

### Screenshots

- `screenshots/01-agent-empty.png` — initial state with empty conversation
- `screenshots/02-agent-task-list.png` — after clicking "我有哪些未完成任务?" — agent lists 4 open tasks
- `screenshots/03-agent-after-summary.png` — after second prompt "总结最近的活动" — agent counts recent activity
- `screenshots/04-v3-standard-regression.png` — standard v3 mode dashboard still renders

### How to verify

```
playwright-cli open
playwright-cli run-code --filename tests/e2e/real-device.mjs
playwright-cli eval "() => JSON.stringify(window.__testTally, null, 2)"
playwright-cli goto http://127.0.0.1:3939/?cockpit=1#/agent
```

## Milestone

This is the **last `soon` placeholder** in the cockpit sidebar. All 12 nav items (今日, 笔记库, 知识图谱, 任务, 日程, 回顾, 资源库, 模板, 标签, 智能体, 设置 — plus the soon badges are 0) are now real implementations.

Cockpit sidebar: 12 of 12 sections feature-complete.

## Tradeoffs

- **Local-echo is rule-based, not LLM-based** — fine for the v0.4 stub but won't handle complex questions. Real LLM integration lands in v0.5 (Ollama + OpenAI-compatible adapter per ADR-0002).
- **No conversation history persistence** — refresh the page and the chat is gone. v0.5 should persist to vault under `00-AI/agent/YYYY-MM-DD.md`.
- **No tool-use** — agent can read vault state but can't create entities, run queries, etc. v0.5+ adds tool-use per the agent-app design.
- **5 quick prompts are opinionated** — the user's actual questions may not match these keywords. Filed v0.4.c6.x: improve keyword matching or use fuzzy intent detection.
