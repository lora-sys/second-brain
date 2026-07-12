# ADR-0004: SQLite + JSONL for event log (hybrid)

- **Status**: Proposed
- **Date**: 2026-07-12
- **Deciders**: @coordinator, @human
- **Driver Issue**: v0.5 (TBD)

## Context

The event stream is the substrate of every AI feature. It needs:
- Append-only writes (events never get updated)
- Fast full-text search (for reflection agent to find "yesterday's events about X")
- Vector search (for semantic similarity)
- Human-readable (for the user to inspect in their vault)

## Decision

**Hybrid storage:**
- **JSONL file** in the vault under `00-AI/events/YYYY-MM-DD.jsonl` — human-readable, lives alongside other notes
- **SQLite + FTS5** at `~/.local/share/second-brain/index.db` — fast queries, embedded, no server

The SQLite index is **derived from the JSONL**: it can be rebuilt any time by replaying events. The JSONL is source of truth.

## Alternatives Considered

- **SQLite only**: fast but not human-readable; user can't open it in Obsidian
- **JSONL only**: easy to read, but full-text search is slow
- **LanceDB / vector DB only**: nice for semantic but overkill for the file-watch case
- **Postgres**: requires a server, breaks the local-only promise

## Consequences

### Positive
- JSONL is the canonical event log — visible in Obsidian, version-controllable
- SQLite gives us fast queries and FTS5
- User can always rebuild the index from the JSONL (e.g., after a crash or format change)
- AI prompts can include "today's events" by reading the JSONL directly

### Negative
- Two systems to keep in sync
- SQLite must be rebuilt if the JSONL changes externally
- Disk usage (JSONL + index)

### Mitigations
- Background indexer that watches the JSONL directory
- Index version stored in SQLite, with a `--rebuild-index` command

