# v0.5 — Event Stream + Daily Memory · Change Summary

## What changed

The Second Brain OS now has a full event pipeline + daily journal generator.

## Architecture

```
vault CRUD ──→ EventStore ──→ /api/events (read)
                  ↓
              /api/daily (generate) ──→ LLM Provider ──→ 00-Daily/YYYY-MM-DD.md
                                       ↑
                              LocalEchoProvider (default)
                              OpenAI-compatible (Ollama, OpenAI, LM Studio)
```

## Backend (Node)

- `lib/eventstore.mjs` — JSONL append-only event log
  - One file per day: `vaultRoot/.events/YYYY-MM-DD.jsonl`
  - `append(type, payload)` — atomic append via `fs.open('a')` + serialised writes via promise queue
  - `readRange(from, to)` — walk day-by-day, parse JSONL, skip malformed lines
  - `readLastNDays(n)` — convenience for "give me the last week"
- `lib/llm/openai.mjs` — proper OpenAI-compatible provider (was a stub)
  - POST `/chat/completions` with the right shape
  - Works with OpenAI, Ollama (`/v1`), LM Studio, vLLM, etc.
  - Reads `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` from env
  - Detects "isLocal" by checking if baseURL is localhost/127.0.0.1
- `lib/daily.mjs` — daily journal generator
  - `summariseEvents()` — formats events into a compact summary
  - `buildPrompt()` — full LLM prompt with system + context + recent journals
  - `localEchoDaily()` — deterministic fallback (no LLM needed)
  - `generateDaily()` — picks provider, runs prompt or local-echo
  - `writeDaily()` — atomic write to `vaultRoot/00-Daily/YYYY-MM-DD.md`
  - `readRecentJournals()` — list journals for the prompt context
- `lib/server.mjs`
  - CRUD handlers now take `events` and emit on success:
    - `task.created` / `task.updated` / `task.deleted` / `task.done` / `task.in_progress` / etc.
    - `person.created` / `person.updated` / `person.deleted`
    - `project.created` / etc.
    - `link.imported` (with fetch status)
    - `daily.generated`
  - New endpoints:
    - `GET /api/events?days=N` — list recent events
    - `GET /api/daily` — list recent journals
    - `POST /api/daily { days, date }` — generate today's journal
    - `GET /api/daily/YYYY-MM-DD` — read a specific journal

## Frontend (Cockpit)

- New sidebar item: **日记** (`#daily`)
- `public/lib/cockpit.js`
  - `renderDaily()` — status cards (provider / events today / journals total) + actions (generate button) + history list + viewer
  - `bindDailyActions()` — wires the generate button + history clicks
- `public/style.css` — `.cockpit-daily*` styles (~150 lines)
- `public/app.js` — added `daily` route, exposed `window.toast`

## Verification

### E2E test results

```
41 passed, 0 failed in 25,134 ms
```

7 new tests for v0.5:
- daily page renders
- generate button present
- status cards present
- clicking generate produces journal content
- /api/events endpoint works
- /api/daily endpoint works
- (regression) NO soon badges remain

Bumped nav-item count from 11 → 12 to account for the new 日记 item.

### Manual smoke tests

```
$ curl -X POST http://127.0.0.1:3939/api/daily -d '{"days":1}'
{
  "ok": true, "date": "2026-07-14",
  "path": "/home/lora/文档/Obsidian Vault/00-Daily/2026-07-14.md",
  "content": "---\ndate: 2026-07-14\ntype: daily-journal\neventsCount: 5\nprovider: local-echo\nmodel: deterministic-stub\n---\n# 2026-07-14 日记\n...",
  ...
}

$ cat /home/lora/文档/Obsidian\ Vault/00-Daily/2026-07-14.md
[frontmatter + 4-section journal content]
```

### Screenshots

- `screenshots/01-daily-empty.png` — initial state
- `screenshots/02-daily-generated.png` — after clicking generate, journal shown
- `screenshots/03-v3-standard-regression.png` — standard v3 mode unaffected

## Tradeoffs

- **Local-echo daily is rule-based** — works without any LLM. The full prompt-based version runs only when `OPENAI_API_KEY` (or `OPENAI_BASE_URL` for Ollama) is configured.
- **No file watcher yet** — events come from CRUD only. File watcher lands in v0.5.x.
- **No conversation history for the daily agent** — each generation is independent. Recent journals are passed as context but not as conversation.
- **EventStore uses the vault's own filesystem** — works in both browser and Tauri modes. Tauri permissions will need to allow `.events/` directory writes; for v0.5 we're testing in browser mode.
- **No SQLite FTS5 yet** — JSONL is enough for the daily horizon (7 days). v0.5.x adds SQLite for longer retention.

## Privacy

- Events stay inside the vault. The `.events/` directory is local.
- Daily journal content is generated locally by default (LocalEcho).
- When `OPENAI_API_KEY` is set, the prompt (events summary, not full vault content) is sent to the configured endpoint.
- The cockpit's daily view surfaces the provider name so users always know which mode is active.
