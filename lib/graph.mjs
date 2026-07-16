// Knowledge-graph builder (v0.19) — extracted from cockpit.js.
//
// Pure data, no DOM. Inputs: an entities object `{ person: [...], task: [...],
// project: [...], link: [...] }`. Each entity must at minimum have `id`,
// `slug`, `type`, `body`, and `data.title` / `data.tags` (any pattern the
// vault returns). Output: `{ nodes, edges, hubs, degree, adjacency }`.
//
// Edges are added when:
//   - One entity's body contains a wikilink to the other ([[type/slug]] or [[slug]])
//   - Two entities share at least one tag
//
// v0.19 — also exported so server-side MCP / future API endpoints can build
// the graph without going through the browser's cockpit state.

export function buildGraph(state) {
  const e = state && state.entities;
  if (!e) return { nodes: [], edges: [], hubs: [], degree: {}, adjacency: {} };
  const all = [];
  for (const type of ['person', 'task', 'project', 'link']) {
    for (const item of (e[type] || [])) {
      all.push({ ...item, _type: type });
    }
  }
  if (all.length === 0) {
    return { nodes: [], edges: [], hubs: [], degree: {}, adjacency: {} };
  }
  const byId = {};
  const bySlug = {};
  for (const it of all) {
    byId[it.id] = it;
    bySlug[`${it._type}/${it.slug}`] = it;
    bySlug[it.slug] = it;
  }
  // Pure helper: resolve the display title for an entity. We return it as a
  // top-level helper rather than the closure-bound `titleOf` we used to
  // attach to the graph object.
  const titleOf = (it) => {
    if (!it) return '';
    return (it.data && (it.data.title || it.data.name)) || it.slug || '';
  };

  const edges = new Map();
  const addEdge = (from, to, reason) => {
    if (!from || !to || from.id === to.id) return;
    const key = [from.id, to.id].sort().join('|');
    if (!edges.has(key)) edges.set(key, { from: from.id, to: to.id, reasons: new Set() });
    edges.get(key).reasons.add(reason);
  };

  // Wikilink edges
  const wikiRe = /\[\[([^\]]+)\]\]/g;
  for (const it of all) {
    const body = it.body || '';
    let m;
    while ((m = wikiRe.exec(body)) !== null) {
      const target = m[1].trim();
      const resolved = bySlug[target];
      if (resolved) addEdge(it, resolved, 'wikilink');
    }
  }

  // Tag-overlap edges
  const tagToEntities = {};
  for (const it of all) {
    for (const tag of (it.data && it.data.tags) || []) {
      if (!tagToEntities[tag]) tagToEntities[tag] = [];
      tagToEntities[tag].push(it);
    }
  }
  for (const tag of Object.keys(tagToEntities)) {
    const bucket = tagToEntities[tag];
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        addEdge(bucket[i], bucket[j], `#${tag}`);
      }
    }
  }

  // Compute degree
  const degree = {};
  for (const it of all) degree[it.id] = 0;
  for (const edge of edges.values()) {
    degree[edge.from] = (degree[edge.from] || 0) + 1;
    degree[edge.to] = (degree[edge.to] || 0) + 1;
  }
  const hubs = all
    .filter((it) => degree[it.id] > 0)
    .sort((a, b) => degree[b.id] - degree[a.id]);

  // Adjacency
  const adjacency = {};
  for (const it of all) adjacency[it.id] = [];
  for (const edge of edges.values()) {
    adjacency[edge.from].push({ other: edge.to, reasons: Array.from(edge.reasons) });
    adjacency[edge.to].push({ other: edge.from, reasons: Array.from(edge.reasons) });
  }

  // Convert reasons Set -> Array for JSON-friendly output. The
    // matching adjacency entries also already store Array.
  const edgesArr = Array.from(edges.values()).map(e => ({
    ...e, reasons: Array.from(e.reasons)
  }));
  return {
    nodes: all,
    edges: edgesArr,
    hubs,
    degree,
    adjacency,
    // Helpers — v0.19 exposes these rather than embedding them on the
    // closure. Same shape the cockpit code expected (`g.titleOf`,
    // `g.byId`).
    titleOf,
    byId,
  };
}
