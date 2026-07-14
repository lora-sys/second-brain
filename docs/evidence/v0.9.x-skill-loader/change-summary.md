# v0.9.x — Skill Loader · Change Summary

## What changed

The Personal Agent now **auto-loads skills** based on prompt keyword match. When a user asks a question, the agent:
1. Calls `GET /api/skills?q=<prompt>` to find matching skills
2. Injects the matched skills' info into the response (default branch)
3. Shows "N skill(s) 注入" in the response metadata

## How matching works

The existing `matchSkills(skills, prompt)` function uses keyword overlap:
- Each token in the prompt (length ≥ 2) is checked against the skill's name + description + tags
- Tag matches score 2x, name/description matches score 1x
- Top 3 skills with score > 0 are returned

## Behavior

- User asks: "给我这周的 weekly summary"
- Agent queries `GET /api/skills?q=给我这周的 weekly summary`
- Server returns matching skills (e.g. "Weekly summary" and "Summarize events")
- Default-branch response includes:
  - Vault summary (unchanged)
  - "可用的 skills (N):" section listing matched skills with descriptions
- Response meta shows: `local-echo · ... · 0ms · 2 skill(s) 注入`

## Implementation

- `public/lib/cockpit.js`
  - `agentComplete(prompt, state, skills)` — new third parameter
  - Default branch appends skill list to the response
  - Return object now includes `skillsLoaded: <count>`
  - `bindAgentActions` — fetches `GET /api/skills?q=<text>` before calling `agentComplete`
  - Response meta shows skill count when > 0

## Verification

### E2E test results

```
78 passed, 0 failed in 43,580 ms
```

2 new tests:
- `GET /api/skills?q=...` returns matching skills
- `skills: API match by query returns relevant skills` (with unique marker)

### Manual smoke test

In the agent page, type a prompt that matches a skill:
- Input: "给我这周的 weekly summary"
- The "weekly-summary" skill + "summarize-events" skill are both loaded
- Response meta shows: "local-echo · ... · 0ms · 2 skill(s) 注入"
- Response body shows:
  ```
  [local-echo] 你的 vault 现在有 2 个人物、24 个任务、1 个项目、3 个链接。
  
  可用的 skills (2):
  - Summarize events: Read last 7 days of events and write a short summary
  - Weekly summary: Generate a weekly summary of activity, completed work, and pending tasks
  ```

### Screenshots

- `screenshots/01-skill-injected.png` — agent page with skill-injected response

## Tradeoffs

- **Skills only injected in default branch** — when a specific intent matches (tasks, recent activity, etc.), skills are NOT listed. Could be added universally. Filed v0.9.x.
- **Keyword-only matching** — no semantic similarity. "give me a summary" doesn't match "Summarize events" perfectly. Filed v0.9.x.
- **No skill body in response** — only the name + description are shown. Could include the body for context. Filed v0.9.x.
- **Real LLM doesn't get skills yet** — only the local-echo provider shows them. The OpenAI path is unchanged. Filed v0.9.x.

## Privacy

- All skill matching is local. No external API calls.
- Skill files live in the vault under `00-AI/skills/`. User-controlled.
