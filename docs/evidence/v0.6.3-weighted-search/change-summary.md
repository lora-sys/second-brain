# v0.6.3 — Weighted Search · Change Summary

## What changed

The search endpoint now uses weighted scoring (instead of substring match), and the search UI shows the score per result.

## Scoring

| Field | Match type | Score |
|---|---|---|
| title / name | exact | 100 |
| title / name | contains | 30 |
| slug | exact | 20 |
| tag | exact | 25 |
| tag | contains | 10 |
| body | per match (capped at 30) | 5 each |
| recency | +1 per day, capped at +10 | bonus |

Multi-token queries use AND semantics: all tokens must match somewhere.

## Behavior

```
GET /api/search?q=alice
→ { items: [...], scores: [59, 14, 14, 14, 13], total: 5 }
```

- Results capped at 50
- Sorted by score desc
- Total count returned in `total` field
- Empty query → `{ items: [], total: 0 }`

## UI

The search dropdown now shows:
- A header line ("前 5 / 共 5" or "5 个结果")
- A score badge on each result (small purple pill)

## Implementation

- `lib/server.mjs` — `scoreEntity(e, tokens)` + updated `handleSearch`
- `public/app.js` — search UI shows scores and total
- `public/style.css` — `.search-result-header`, `.search-result-score`
- `tests/e2e/real-device.mjs` — 2 new tests

## Verification

### Smoke test

```
$ curl 'http://127.0.0.1:3939/api/search?q=alice'
{
  "items": [
    {"type": "person", "slug": "alice", ...},
    {"type": "task", "slug": "quarterly-review", ...},
    ...
  ],
  "scores": [59, 14, 14, 14, 13],
  "total": 5
}
```

Alice ranks first (59) because her title is an exact match. Tasks that mention her body rank lower (14). Bob ranks last (13) because he's only mentioned in her body.

### E2E test results

```
54 passed, 0 failed in ~36,000 ms
```

### Screenshots

- `screenshots/01-search-with-scores.png` — search dropdown showing score badges

## Tradeoffs

- **No stemming** — searching "running" won't match "run". Filed v0.6.3.x.
- **No fuzzy matching** — typo in query returns no results. Filed v0.6.3.x.
- **No Chinese tokenization** — Chinese words are matched as character substrings, not word boundaries. Could be improved with jieba or similar. Filed v0.6.3.x.
- **Recency boost is linear-decay** — could be exponential. Acceptable for v0.6.3.

## Privacy

- Pure server-side computation. No data leaves the machine.
- Recency is computed from `data.updated` field, which is user-controlled.
