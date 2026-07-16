# v0.20 — MCP Resources + Prompts · Adversarial Review

## Self-review

### Bug-hunter

- **`vault://graph` large-payload risk** — `buildGraph()` returns
  every entity and every edge. For a vault with 10k entities this
  could be hundreds of KB. Filed as `v0.20.x`: add `?limit=N` and
  default to 500 in the response.
- **`vault://recent` time-zone dependence** — uses `Date.now()`
  inside the resource handler. Tests run with synthetic data; the
  live dependency on the user's clock is no worse than the existing
  `/api/events?days=7` endpoint that has shipped since v0.5.1.
- **Skill body leakage** — `vault://skills` returns the
  frontmatter (slug, name, description, tags) only, NOT the body.
  Skill bodies can be long and would risk huge payloads. The path
  to skill bodies is `tools/call get_entity` (which returns the
  full skill like any other entity). Resources stay slim.
- **Prompt injection via arg** — `draft-decision`'s `context`
  string flows directly into the template. Same threat as the
  existing `/api/agent` endpoint (v0.30): the LLM receives it, and
  the same mitigations apply (the OpenAI vendor is responsible for
  prompt-injection defenses).

### Behavior reviewer

- All JSON-RPC responses are 200 OK with a `result`. Errors come
  back as `error: { code: -32602, message: '...' }`. Consistent
  with the existing `tools/call` path.
- `notifications/initialized` produces no response. Tested.
- `initialize` reports protocolVersion `2024-11-05` (a stable
  MCP version), the existing value. Compatible with Claude
  Desktop ≥ 0.5 and Codex CLI 0.74+.

### Architecture reviewer

- **Two new sibling modules** with a clean import surface.
  `mcp-resources.mjs` and `mcp-prompts.mjs` are exported stand-alone
  so a future MCP-over-HTTP transport (filed as v0.20.x) can reuse
  the same handlers.
- **Existing tools unchanged** — diff is additive only. v0.11 +
  earlier MCP clients keep working.
- **No new deps.** Stayed in 3-dep budget.
- **Tested in isolation** — 45 unit tests don't require a live MCP
  server. Resource handlers accept a stub `Vault` (only need
  `listAll()`, `list(type)`, and `root`). Prompt handlers are
  pure functions over args.

### Security reviewer

- **No new attack surface.** Resources are read-only operations
  against the local vault. Prompts emit strings, no I/O.
- **`vault://skills` does not return body** — skill bodies could
  be long and are sensitive ("how I take notes"). Resources
  deliberately stop at the metadata level. Body access remains
  on `tools/call get_entity(id)` where the user has explicitly
  decided to share.
- **`prompts/get` doesn't accept arbitrary input.** All 4 prompts
  accept only known argument names. A bad argument name is just
  ignored.

### UI reviewer
N/A — no visible change in any UI; this is server-internal.
