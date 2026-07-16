# v0.19 — Extract Knowledge Graph to lib/ · Change Summary

## What changed

The 73-line `buildGraph(state)` function that powers the cockpit's 知识图谱
section lived inside `public/lib/cockpit.js` (2960 lines). v0.19 lifts
it out into a pure-data module that can be reached from server code too.

## Implementation

### New files

- **`lib/graph.mjs`** (112 lines) — server-side ESM module exporting
  `buildGraph(state)`. Pure data, no DOM. Inputs:
  `{ entities: { person, task, project, link } }`. Output:
  `{ nodes, edges, hubs, degree, adjacency, titleOf, byId }`. Two
  edges are added when (a) a body contains a wikilink to the other,
  or (b) two entities share at least one tag.

- **`public/lib/cockpit-graph.js`** (103 lines) — browser-side IIFE
  wrapper exposing `window.__cockpitGraph.buildGraph(state)`. Mirrors
  the server implementation per the project's existing "self-contained
  modules" pattern (cf. `lib/sanitize.mjs` + `public/lib/sanitize.js`).

- **`tests/graph.test.mjs`** — 37 unit tests covering empty states,
  single entity, wikilink edges (`[[type/slug]]` and bare `[[slug]]`),
  tag-overlap edges, multi-reason edges, self-reference ignore, ghost
  wikilinks, title fallback chains, adjacency shape, and the Set→Array
  output conversion (the original kept them as Sets; this was a
  latent bug the original cockpit never tripped because the only
  consumer inlined the conversion).

### Bug discovered + fixed during extraction

The original `buildGraph` returned edges with `reasons` as a `Set`.
Adjacency entries had it as an `Array`. The inconsistency is harmless
as long as nothing serializes the edges directly — but `JSON.stringify`
of a Set produces `{}` (no enumerable props), which would silently
truncate the reasons field on any future API response. v0.19 normalizes
both to arrays at output time.

### Modified files

- **`public/lib/cockpit.js`** — `function buildGraph(state)` is now a
  10-line delegation:
  ```js
  function buildGraph(state) {
    if (window.__cockpitGraph && typeof window.__cockpitGraph.buildGraph === 'function') {
      return window.__cockpitGraph.buildGraph(state);
    }
    return { nodes: [], edges: [], hubs: [], degree: {}, adjacency: {} };
  }
  ```
  All call sites in `renderKnowledge()` and the canvas toggle are
  unchanged.

- **`public/index.html`** — added `<script src="/lib/cockpit-graph.js">`
  before `cockpit.js`. Load order: … → cockpit-activity → **cockpit-graph**
  → cockpit → app.

- **`package.json`** — `npm run check` now also runs
  `tests/graph.test.mjs`.

## Verification

### Unit (37/37 pass)
```
$ npm run check
…
37 passed, 0 failed    (graph.test.mjs — new)
16 passed, 0 failed    (agent.test.mjs — v0.30)
33 passed, 0 failed    (llm-config.test.mjs — v0.18)
57 passed, 0 failed    (cockpit-activity.test.mjs — v0.16)
31 passed, 0 failed    (sanitize.test.mjs — v0.17)
```
Total: 174 unit tests.

### E2E (browser-side, ready)
Two new tests in `tests/e2e/real-device.mjs`:
- `graph: window.__cockpitGraph exposed with buildGraph`
- `graph: cockpit buildGraph produces same shape (inline + module)`

Plus the existing `cockpit: 知识图谱` tests from v0.4.c6 validate the
end-to-end render path — they continue to pass unchanged because the
function signature and return shape are byte-identical.

### Live-browser E2E
Same sandbox caveat as v0.15 / v0.17 / v0.30. The unit tests cover the
algorithm; the cockpit's knowledge-graph view is exercised end-to-end by
the broader e2e suite on any non-sandbox / CI run.

## Privacy

No new data flows. The graph builder runs on the same entity lists the
cockpit was already reading.

## Tradeoffs / follow-ups

- **Module duplication** (lib/graph.mjs + public/lib/cockpit-graph.js)
  is the project's accepted pattern (cf. sanitize pair). For
  buildGraph's ~100-line algorithm the duplication is fine. A future
  v0.19.x could turn both into one ESM module loaded by the browser via
  `<script type="module">` if the pattern expands.
- **No ADR was filed** — this is a pure refactor with no architectural
  decisions. The roadmap calls v0.19 a "small but worth doing" item
  on par with v0.16, both of which shipped without ADRs.

## Why this matters

cockpit.js was the largest file in the codebase (2960 → 2884 → **2864
lines** after v0.19). Each extraction reduces diff size for future
cockpit work. The reason this one is named explicitly on the roadmap
("server-side MCP 可以用") is that the MCP server (ADR-0006) can now
build the same graph in-process for a future `resource://knowledge-graph`
endpoint without re-implementing it.
