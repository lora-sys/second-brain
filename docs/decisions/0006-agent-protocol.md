# ADR-0006: Agent Protocol — Second Brain is callable by external AIs (MCP-first)

- **Status**: Proposed
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.9 (TBD, but capture layer in v0.5)

## Context

The user asked: "可以让别的ai 可以操控我们的应用" (let other AIs control our app). This means:

- Claude Desktop, Codex CLI, Hermes, Cursor, Continue.dev, etc. should be able to:
  - **Read** the user's notes (e.g., "summarize everything I know about X")
  - **Write** to the vault on the user's behalf (e.g., "log this conversation as a meeting note")
  - **Query** semantic relationships (e.g., "what other tasks block X?")
  - **Emit events** (e.g., "this conversation just happened")

The emerging standard for this is **MCP (Model Context Protocol)** — Anthropic's open protocol for connecting LLM clients to local data sources. Claude Desktop, Codex CLI, and a growing ecosystem of tools already support it natively.

## Decision

**Adopt MCP as the primary agent-facing protocol.** Second Brain ships an MCP server that exposes:

### Tools (exposed to AIs)

| Tool | Description |
|---|---|
| `sb_search` | Search entities by text / tag / type |
| `sb_get` | Get a single entity (person / task / project / link) by id |
| `sb_create` | Create a new entity |
| `sb_update` | Update an existing entity |
| `sb_delete` | Delete an entity |
| `sb_wiki` | Resolve a `[[wikilink]]` to its target |
| `sb_recent` | Recently edited entities |
| `sb_event` | Emit a custom event to the user's event stream |
| `sb_journal` | Read past daily journal entries |
| `sb_ask` | Ask Second Brain (full RAG over vault) |

### Resources (read-only access)

| Resource | Description |
|---|---|
| `entity://<type>/<slug>` | A single entity |
| `tag://<tag>` | All entities with a given tag |
| `recent://<n>` | Last N edited entities |
| `daily://<YYYY-MM-DD>` | A daily journal entry |

### Prompts (reusable)

| Prompt | Description |
|---|---|
| `summarize-person` | Pull everything known about a person |
| `weekly-reflection` | Generate a weekly reflection from events |
| `task-triage` | Prioritize tasks by deadline / priority / dependencies |

## Why MCP

- **Standard, not proprietary**: Claude Desktop, Codex CLI, Continue, Cline, and others all support MCP natively
- **Local-only by default**: MCP servers are local processes, perfect for our threat model
- **Discovery**: clients can list available tools/resources at startup
- **Streaming**: long-running operations (e.g., daily journal) can stream progress
- **Permission model**: clients can prompt the user before each call

## Capture layer (the user's question: "捕获层怎么做")

The capture layer is how external events get INTO Second Brain. Three complementary channels:

### Channel A — File watcher (always on)
- Watches `<vault>/**` for changes via `chokidar` (Node) / `notify` (Rust)
- Detects: file created, file modified, file deleted, file renamed
- Emits `file.changed` events with before/after content hash
- **Free**, automatic, no tool integration needed

### Channel B — MCP `sb_event` tool (explicit)
- External AIs (Claude, Codex, etc.) call `sb_event` to log what they did
- Examples:
  - "I just ran a command `git commit` in repo X"
  - "I created a new file Y"
  - "I had a conversation about Z"
- **Structured** — event goes into JSONL with the source AI's identifier
- Requires the AI to be configured to call this (and remember to)

### Channel C — HTTP webhook (`POST /api/agent/event`)
- Lightweight endpoint for tools that can't easily shell out or speak MCP
- Accepts JSON: `{source, type, payload, ts}`
- Same backend as Channel B — both write to JSONL
- Examples: browser extensions, CLI wrappers, mobile share-sheet targets

### Bonus — Shell CLI (`bin/sb-capture`)
- `sb capture "type" "note"` — single command, appends an event
- For tools like shell aliases, git hooks, cron jobs
- Wraps the same JSONL writer

## Consequences

### Positive
- Second Brain becomes the "memory layer" of any AI tool the user touches
- Capture is automatic + explicit — events are never lost
- MCP means zero integration code per tool — any MCP client works
- The user's vault grows organically from everything they do

### Negative
- MCP server is a new binary to ship, document, and keep running
- Capture volume could grow fast → need a retention policy
- AI tools that don't speak MCP need a wrapper
- More attack surface (any local process can call the API)

### Mitigations
- MCP server runs on `127.0.0.1` only, no auth needed (single user)
- Events older than N days can be archived (configurable)
- `.env`-style local config for any future per-tool tokens
- All captures go through the same JSONL → auditable
