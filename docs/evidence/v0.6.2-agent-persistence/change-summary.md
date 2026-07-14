# v0.6.2 — Agent Conversation Persistence · Change Summary

## What changed

The cockpit 智能体 page now persists conversation history across page reloads. Users no longer lose their chat when they accidentally refresh.

## Implementation

- localStorage key: `sb-agent-history-v1`
- On page load: read history, render saved messages
- After each send: save current conversation state
- "清空历史" button (visible only when history exists) lets users wipe

## Behavior

- **Survives reload** — Refresh the page, conversation is still there
- **Survives tab close + reopen** — localStorage is per-origin, persists across sessions
- **Storage is small** — 2 messages ≈ 600 bytes; well within localStorage limits
- **Clear button** — explicit user action; confirmation prompt

## Tradeoffs

- **No server-side persistence** — localStorage only; if user clears browser data, history is gone. Filed v0.6.2.x: vault-side persistence under `00-AI/agent/YYYY-MM-DD.md`.
- **No edit/delete on past messages** — read-only history. Filed v0.6.2.x.
- **Storage bloat over time** — at 100 conversations × ~5KB = 500KB. localStorage typically allows 5-10MB. Acceptable for v0.6.2.
- **No sync between tabs** — if the user has 2 tabs open, each has its own conversation state. Filed v0.6.2.x: BroadcastChannel or storage event sync.

## Privacy

- All conversation history stays in the user's browser. Nothing leaves the machine.
- No telemetry. No analytics. Pure localStorage.
