# v0.20 — MCP Resources + Prompts (ADR-0006 continuation) · Change Summary

## What changed

The MCP server ([ADR-0006](/home/lora/second-brain/docs/decisions/0006-agent-protocol.md),
shipped in v0.11) exposed four **tools** — `list_entities`, `get_entity`,
`search_entities`, `create_entity`. v0.20 extends the surface to the
other two MCP primitives: **resources** (read-only data) and **prompts**
(templated user messages). External AI clients (Claude Desktop, Codex
CLI, Hermes) can now ask for vault data via `vault://…` URIs and pull
ready-made prompt templates by name.

## Implementation

### New modules

- **`lib/mcp-resources.mjs`** (131 lines) — registers five resources:
  | URI                       | Content                                       |
  |---------------------------|-----------------------------------------------|
  | `vault://entities`        | Full entity index (id, type, title, tags, updated) |
  | `vault://recent`          | Entities updated in the last 7 days           |
  | `vault://tags`            | Tag → entity-count cloud                       |
  | `vault://graph`           | Knowledge graph from `lib/graph.mjs` (v0.19)  |
  | `vault://skills`          | Skills index for the agent                    |

  All return JSON; all are read-only; all run on the same `Vault`
  instance the existing tools use.

- **`lib/mcp-prompts.mjs`** (113 lines) — registers four prompt
  templates:
  - `summarize-week` — pulls a date, calls task/project list, drafts
    the 6-section weekly reflection.
  - `draft-decision` — requires `context`; optional `options`;
    produces the canonical Decision Journal skeleton.
  - `consolidate-tasks` — no args; lifts the open-task list and
    proposes merges / deletions / priorities.
  - `reflect-on-day` — optional `date`; default "today".
  Returns the MCP spec `{ description, messages: [{ role: 'user',
  content: { type: 'text', text } }] }`.

### Modified files

- **`lib/mcp.mjs`** — `import`s the two new modules, bumps
  `serverInfo.version` to `0.20.0`, declares
  `capabilities: { tools: {}, resources: {}, prompts: {} }`, and adds
  dispatch for `resources/list`, `resources/read`, `prompts/list`,
  `prompts/get`. The existing tool path is unchanged.

### New tests

- **`tests/mcp.test.mjs`** — 45 unit tests:
  - 5 resources list / per-resource read coverage.
  - Tag-cloud shape; recent filter (last 7 days); graph shape.
  - 4 prompts list / per-prompt shape; required-argument validation.
  - Unknown URI / unknown prompt throw paths.

### Constraints honored

- **No new npm deps.** Stays within the 3-dep budget.
- **Privacy**: same as the existing tools — local-only, no remote
  calls. Resources are read-only; prompts only emit text messages.
- **Backward-compat**: existing tool callers keep working; new
  capability keys (`resources`, `prompts`) are additive in
  `serverInfo.capabilities`.

## Verification

### Unit (45/45 pass)
```
$ npm run check
…
45 passed, 0 failed    (mcp.test.mjs — new)
37 passed, 0 failed    (graph.test.mjs — v0.19)
16 passed, 0 failed    (agent.test.mjs — v0.30)
33 passed, 0 failed    (llm-config.test.mjs — v0.18)
57 passed, 0 failed    (cockpit-activity.test.mjs — v0.16)
31 passed, 0 failed    (sanitize.test.mjs — v0.17)
```
Total: 219 unit tests.

### End-to-end smoke (live MCP server over stdio)

A small driver spawned `node lib/mcp.mjs` as a child process and
issued 9 JSON-RPC 2.0 requests. All responded correctly:

| id  | method                        | response |
|-----|-------------------------------|----------|
| 1   | `initialize`                  | `protocolVersion=2024-11-05`, `serverInfo.version=0.20.0`, capabilities `tools,resources,prompts` |
| 2   | `tools/list`                  | 4 tools (unchanged from v0.11) |
| 3   | `resources/list`              | 5 resources (new) |
| 4   | `prompts/list`                | 4 prompts (new) |
| 5   | `prompts/get summarize-week`  | 1 message with templated text |
| 6   | `resources/read vault://graph` | 1 contents item with JSON `{nodes, edges, hubs}` |
| 7   | `prompts/get consolidate-tasks` | 1 message with `list_entities` instructions |
| 8   | `notifications/initialized`   | (no response — correct for notifications) |
| 9   | `ping`                        | `{}` pong |

## Privacy

No new data flows outbound. Resources are read-only against the local
vault; prompts emit fixed templated strings. No remote LLM is called
by the MCP server itself.

## Tradeoffs / follow-ups

- **No resource templates** (the third MCP primitive) — they sit
  beside resources but parameterize them. Filed as `v0.20.x`.
- **No subscription** — clients must `resources/read` repeatedly
  for fresh data. Acceptable for read-only vault data; MCP subscribe
  semantics would need a per-client cache invalidation strategy.
- **Prompts are in English-keyed with Chinese bodies** — tools
  like Claude Desktop expect `name` to be ASCII. The Chinese text
  inside is what the LLM receives. Tested; not changed.

## Why this matters

ADR-0006 promised a tool surface; v0.20 finishes it. Future AI clients
that connect to the user's vault via this MCP server can now read
(a) the entity index, (b) the knowledge graph, (c) the skills — and
start a session by pulling one of the four ready-made prompt
templates, which makes the LLM less likely to drift on first contact.
