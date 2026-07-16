// v0.19 — Browser-side wrapper for the knowledge-graph builder.
//
// `lib/graph.mjs` is the canonical server-side ESM module. This file is the
// IIFE browser wrapper so cockpit.js can call
// `window.__cockpitGraph.buildGraph(state)` without a bundler step.
//
// The implementation here mirrors lib/graph.mjs. Per the project's
// "self-contained modules" pattern (cf. sanitize), we accept this small
// duplication rather than fetching the ESM file as text.

(function () {
  'use strict';

  function buildGraph(state) {
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

    const degree = {};
    for (const it of all) degree[it.id] = 0;
    for (const edge of edges.values()) {
      degree[edge.from] = (degree[edge.from] || 0) + 1;
      degree[edge.to] = (degree[edge.to] || 0) + 1;
    }
    const hubs = all
      .filter((it) => degree[it.id] > 0)
      .sort((a, b) => degree[b.id] - degree[a.id]);

    const adjacency = {};
    for (const it of all) adjacency[it.id] = [];
    for (const edge of edges.values()) {
      adjacency[edge.from].push({ other: edge.to, reasons: Array.from(edge.reasons) });
      adjacency[edge.to].push({ other: edge.from, reasons: Array.from(edge.reasons) });
    }

    const edgesArr = Array.from(edges.values()).map(e => ({
      ...e, reasons: Array.from(e.reasons)
    }));
    return {
      nodes: all,
      edges: edgesArr,
      hubs,
      degree,
      adjacency,
      titleOf,
      byId,
    };
  }

  window.__cockpitGraph = { buildGraph };
})();
