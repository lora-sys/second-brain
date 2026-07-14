# v0.9 — Skills (Personal Agent) · Change Summary

## What changed

The Personal Agent now has a **Skills system**: reusable instruction sets stored in the vault, surfaced as clickable chips in the agent UI, and one-click savable from any assistant response.

## Architecture

Skills are stored as **markdown files in the vault** under `00-AI/skills/{slug}.md`:

```yaml
---
name: Summarize events
description: Read last 7 days of events and write a short summary
tags: weekly, summary, events
createdAt: 2026-07-14T08:06:18.215Z
---

## Instructions

When the user asks for a summary:
1. Read events from the last 7 days
2. Group by type
3. Highlight completed work and bottlenecks
4. Suggest 1-2 things to do next
```

The body is free-form markdown. Skills are surfaced as a **chip bar** above the conversation. Click a chip → modal opens with the skill body.

## Endpoints

- `GET /api/skills` — list all skills (optionally `?q=...` to match by prompt)
- `GET /api/skills/:slug` — read one skill
- `POST /api/skills` — create a skill (body: `{slug, name, description, tags, body}`)

## UI

- **Chip bar** above the conversation shows all available skills
- **Click chip** → modal opens with skill body
- **New quick prompt**: "保存当前对话为 skill" → opens a save modal pre-filled with the last assistant response
- **Inline save button** "↻ 存为 skill" on every assistant message (when text > 30 chars)
- **Save modal**: name, description, tags, body (pre-filled)

## Implementation

### Backend

- `lib/skills.mjs` — `listSkills`, `readSkill`, `writeSkill`, `matchSkills`
- `lib/server.mjs` — `handleSkillsList`, `handleSkillRead`, `handleSkillCreate`

### Frontend

- `public/lib/cockpit.js`
  - `renderAgent` is now `async`; pre-loads skills list
  - Skill chip bar above the conversation
  - `openSaveSkillModal(text, actions)` — modal flow
  - `openSkillViewerModal(slug)` — read-only viewer
  - `bindSkillChips` — wire chip click → viewer
  - "保存当前对话为 skill" quick prompt + inline button
- `public/style.css` — chip bar, chips, save button, viewer (~30 lines)

### Tests

- `tests/e2e/real-device.mjs` — 2 new tests
  - `GET /api/skills` returns skills array
  - Create + read roundtrip

## Verification

### E2E test results

```
76 passed, 0 failed in 43,736 ms
```

### Manual smoke test

```bash
# Create a skill
$ curl -X POST http://127.0.0.1:3939/api/skills -d '{
    "slug": "summarize-events",
    "name": "Summarize events",
    "description": "Read last 7 days of events",
    "tags": ["weekly", "summary"],
    "body": "## Instructions\n\n1. Read events\n2. Group\n3. Summarize"
  }'
→ { "ok": true, "slug": "summarize-events", "path": "/home/lora/文档/Obsidian Vault/00-AI/skills/summarize-events.md" }

# List skills
$ curl http://127.0.0.1:3939/api/skills
→ { "skills": [{ slug, name, description, tags, path }] }
```

In the cockpit agent page:
- The "Summarize events" chip appears in the bar above the conversation
- Click → modal opens with the body
- Click "保存当前对话为 skill" quick prompt → modal opens with the last assistant response pre-filled
- Click "↻ 存为 skill" inline button → same

### Screenshots

- `screenshots/01-agent-with-skill.png` — agent page with skill chip bar

## Tradeoffs

- **Skills are not auto-loaded into the prompt** — they're a manual UI reference, not part of the system prompt. The actual LLM call doesn't see them. Filed v0.9.x.
- **No skill versioning** — overwrite by slug. Could add `createdAt` + `updatedAt` + version field. Filed v0.9.x.
- **No skill marketplace / sharing** — skills are local-only. Could export as bundle. Filed v0.9.x.
- **No skill match in agent** — when the user asks a question, the local-echo agent doesn't search skills. Filed v0.9.x.
- **No skill import** — must be created via the modal. Could add a paste-to-import flow. Filed v0.9.x.

## Privacy

- Skills are personal instructions. Stored locally in `00-AI/skills/`. No external API calls.
- The save-skill modal pre-fills the agent's last response, which is already local.
