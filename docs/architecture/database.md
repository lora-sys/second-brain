# Database

## Primary store: Obsidian Vault

- Markdown files with YAML frontmatter
- Source of truth for all user data
- Lives wherever the user chose in `config.json`

## Index: SQLite (v0.5+)

- Location: `~/.local/share/second-brain/index.db` (XDG-compliant)
- Schema (planned v0.5):
  - `events` — append-only event log (mirror of JSONL)
  - `entities_fts` — FTS5 virtual table over entity text (title, body, tags)
  - `relations` — (subject, predicate, object) triples (v0.6+)
  - `vectors` — semantic search embeddings (v0.6+)
- Derived from vault, rebuildable any time

## JSONL event log (v0.5+)

- Location: `<vault>/00-AI/events/YYYY-MM-DD.jsonl`
- One event per line, JSON-encoded
- Examples:
  ```json
  {"ts":"2026-07-12T10:00:00Z","type":"task.completed","entity":"20-Tasks/fix-bug"}
  {"ts":"2026-07-12T10:15:00Z","type":"file.changed","path":"10-People/陈一.md"}
  ```
- Human-readable, version-controllable
- Can be fed directly to LLM as part of context

## Migrations

- `~/.local/share/second-brain/migrations/NNNN-name.sql`
- Run automatically on app start; idempotent
- Each migration wrapped in a transaction
- Schema version stored in `meta` table
