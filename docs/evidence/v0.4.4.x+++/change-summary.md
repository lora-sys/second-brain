# v0.4.4.x+++ — vault_search · Change Summary

## What changed

Added `vault_search(query, type_filter)` Rust Tauri command — full-text
search across all entities in the vault. The 7th Tauri command.

With this, the Tauri desktop app has full read-write-delete-search
coverage. Combined with the existing 6 commands, every entity
operation the user can do via the web SPA is also available in the
Tauri app.

## Command

`vault_search(query: String, type_filter: Option<String>) -> Result<Vec<Entity>>`

- `query`: case-insensitive substring. Required (empty/whitespace errors).
- `type_filter`: optional. If set, restricts to one type
  (person/task/project/link).
- Returns entities matching the query, sorted by relevance:
  1. Exact title match (huge bonus, score 500)
  2. Title match (base 100, +bonus for earlier in title)
  3. Body match (base 10, +bonus for earlier in body)
  4. Tiebreaker: `updated` desc

## Frontend bridge

`public/app.js`: `api.search(q)` now calls
`invokeOrFetch('vault_search', { query: q, type_filter: null }, ...)`
in Tauri mode. Browser mode still uses `fetch('/api/search')`.

## Files

- `src-tauri/src/lib.rs`
  - `vault_search(query, type_filter)` — case-insensitive search with
    relevance scoring
  - Registered in `invoke_handler`
  - 7 new unit tests covering all behaviors
- `public/app.js`
  - `api.search(q)` → `invokeOrFetch('vault_search', { query, type_filter }, ...)`

## Verification

### Rust unit tests (34/34 pass consistently across 5 parallel runs)

New tests:
- `vault_search_finds_title_match` — single match in title returns 1 entity
- `vault_search_case_insensitive` — query "ALICE" / "ali" / "chen" all
  match "Alice Chen"
- `vault_search_in_body` — substring in body matches even when title
  doesn't contain it
- `vault_search_with_type_filter` — filtering to one type returns only
  that type
- `vault_search_relevance_ranking` — exact title match ranks above
  partial title match above body-only match
- `vault_search_empty_query_returns_error` — empty/whitespace errors
- `vault_search_no_matches_returns_empty_vec` — returns empty Vec
  (not error) when no matches

### Build
- `cargo check` clean
- `cargo build` clean
- `cargo test --lib` 34/34 deterministic across 5 runs

## Decisions made

### Scoring formula

```
score = (title_match ? 100 : 0)
      + (50 - title_position).max(0)  // earlier = higher
      + (exact_title_match ? 500 : 0)
      + (body_match ? 10 : 0)
      + (50 - body_position).max(0)
```

Tuned so that:
- Title match always outranks body match
- Earlier matches within a field outrank later
- Exact title match is a big jump (catches "show me 'alice' specifically")

### Search across `data` (frontmatter) field

For v0.4.4.x+++, search only matches against `title` and `body`.
Frontmatter data fields (tags, status, priority, due) are NOT searched.
Filed as v0.4.4.x++++ polish: also search data (with field prefix
syntax like `tags:urgent`).

### No pagination

Vault size is small (personal use, hundreds of entities max). Return
all results, let the UI paginate. Filed as polish.

## What's not in this issue (filed as v0.4.4.x++++ follow-ups)

- Search frontmatter data fields (with field prefix)
- Pagination (return top N + total count)
- Highlight matches in the result (mark found text)
- Fuzzy search (typo tolerance)
