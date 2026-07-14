# v0.11 — MCP Server (ADR-0006) · Change Summary

## What changed

Added a Model Context Protocol (MCP) server that external AI clients (Claude Desktop, Codex CLI, custom tools) can spawn to interact with the Second Brain vault.

## Architecture

```
Claude Desktop (or any MCP client)
  ↓ spawns subprocess
node lib/mcp.mjs (stdio transport)
  ↓ JSON-RPC 2.0
Vault (lib/vault.mjs)
  ↓ file I/O
vault/ 20-Tasks/, 30-Projects/, etc.
```

## Tools exposed

| Tool | Description |
|---|---|
| `list_entities` | List all entities, optionally filtered by type (person, task, project, link, decision) |
| `get_entity` | Get a single entity by its vault id (e.g. "20-Tasks/buy-groceries") |
| `search_entities` | Substring search across title, name, body, slug, tags |
| `create_entity` | Create a new entity, returns the new id |

## Implementation

- `lib/mcp.mjs` — new file. JSON-RPC 2.0 server over stdio. Reads config.json, instantiates Vault, processes line-delimited JSON requests, returns JSON responses.
- Uses the existing `Vault` class from `lib/vault.mjs` for all CRUD.
- Tool schemas use JSON Schema for input validation.

## Usage

```bash
# In Claude Desktop config:
{
  "mcpServers": {
    "second-brain": {
      "command": "node",
      "args": ["/path/to/second-brain/lib/mcp.mjs"]
    }
  }
}
```

## Verification

### Manual smoke test

```bash
$ echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node lib/mcp.mjs
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05",...}}

$ echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node lib/mcp.mjs
{"jsonrpc":"2.0","id":2,"result":{"tools":[{name:"list_entities",...}, ...]}}

$ echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_entities","arguments":{}}}' | node lib/mcp.mjs
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"[Alice Chen, Bob Wang, ...]"}]}}
```

## Tradeoffs

- **No streaming** — JSON-RPC responses sent in one chunk. Acceptable for v0.11.
- **No resources/prompts** — only `tools/*` methods. Could add MCP resources and prompts. Filed v0.11.x.
- **No auth** — local stdio, no auth needed. The local spawn is the security boundary. Filed v0.11.x.
- **Substring search only** — no semantic similarity. Filed v0.11.x.

## Privacy

- The MCP server runs as a local subprocess. No data leaves the machine.
- The AI client (Claude Desktop) may send the data to a remote LLM, but that's the client's choice, not the server's.
- This is the same trust model as the existing vault file storage.

## Roadmap

This implements ADR-0006: "MCP server for external AI integration." Claude Desktop / Codex CLI / Hermes can now call into Second Brain.
