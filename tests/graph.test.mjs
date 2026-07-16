// v0.19 — Unit tests for the knowledge-graph builder.
//
// Tests run against lib/graph.mjs (server-side). The browser-side
// public/lib/cockpit-graph.js mirrors this implementation.

import { buildGraph } from '../lib/graph.mjs';

let passed = 0, failed = 0;
function eq(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name);
  console.log('        got:  ' + JSON.stringify(got));
  console.log('        want: ' + JSON.stringify(want));
}
function truthy(name, got) {
  if (got) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name + ' (falsy: ' + JSON.stringify(got) + ')');
}
function falsy(name, got) {
  if (!got) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name + ' (truthy: ' + JSON.stringify(got) + ')');
}

// ===== empty states =====
{
  const g = buildGraph({});
  eq('empty state: nodes', g.nodes, []);
  eq('empty state: edges', g.edges, []);
  eq('empty state: hubs', g.hubs, []);
  eq('empty state: degree', g.degree, {});
  eq('empty state: adjacency', g.adjacency, {});
}
{
  const g = buildGraph({ entities: {} });
  eq('entities={} → empty graph', g.nodes, []);
}
{
  // No type entities at all
  const g = buildGraph({ entities: { person: [] } });
  eq('empty array for type → empty graph', g.nodes, []);
}

// ===== single entity, no edges =====
{
  const state = {
    entities: {
      person: [{ id: '10-People/alice', type: 'person', slug: 'alice', body: 'Hi there', data: { title: 'Alice' } }],
    },
  };
  const g = buildGraph(state);
  eq('single entity nodes.length', g.nodes.length, 1);
  eq('single entity edges.length', g.edges.length, 0);
  eq('single entity hubs (no edges → empty)', g.hubs, []);
  eq('single entity degree alice', g.degree['10-People/alice'], 0);
  eq('single entity titleOf(alice)', g.titleOf(g.byId['10-People/alice']), 'Alice');
}

// ===== two entities + wikilink =====
{
  const state = {
    entities: {
      person: [
        { id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[task/buy-milk]]', data: { title: 'Alice' } },
      ],
      task: [
        { id: '20-Tasks/buy-milk', type: 'task', slug: 'buy-milk', body: '', data: { title: 'Buy milk' } },
      ],
    },
  };
  const g = buildGraph(state);
  eq('wikilink edge count = 1', g.edges.length, 1);
  eq('wikilink edge between alice and buy-milk', g.edges[0].from === '10-People/alice' && g.edges[0].to === '20-Tasks/buy-milk', true);
  eq('wikilink reason', g.edges[0].reasons, ['wikilink']);
  eq('hubs[0] is alice (referencing)', g.hubs[0].id, '10-People/alice');
  eq('hubs[1] is buy-milk', g.hubs[1].id, '20-Tasks/buy-milk');
}

// ===== bare-slug wikilink =====
{
  const state = {
    entities: {
      person: [
        { id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[bob]]', data: { title: 'Alice' } },
      ],
      person: [
        { id: '10-People/alice2', type: 'person', slug: 'alice2', body: 'see [[bob]]', data: { title: 'Alice2' } },
      ],
    },
  };
  // Actually we need to fix the entities object
}

// (Replace above with a proper bare-slug test)
{
  const state = {
    entities: {
      person: [
        { id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[bob]]', data: { title: 'Alice' } },
        { id: '10-People/bob', type: 'person', slug: 'bob', body: 'hi', data: { title: 'Bob' } },
      ],
    },
  };
  const g = buildGraph(state);
  eq('bare-slug wikilink edge count', g.edges.length, 1);
  eq('bare-slug resolves bob (slugs share keyspace)', g.edges[0].reasons, ['wikilink']);
}

// ===== wikilink to type/slug form =====
{
  const state = {
    entities: {
      person: [{ id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[task/buy-milk]]' }],
      task: [{ id: '20-Tasks/buy-milk', type: 'task', slug: 'buy-milk' }],
    },
  };
  const g = buildGraph(state);
  eq('type/slug wikilink resolves', g.edges.length, 1);
}

// ===== wikilink to non-existent target =====
{
  const state = {
    entities: {
      person: [{ id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[ghost]]' }],
    },
  };
  const g = buildGraph(state);
  eq('ghost wikilink produces no edge', g.edges.length, 0);
  eq('alice has degree 0', g.degree['10-People/alice'], 0);
}

// ===== tag-overlap edges =====
{
  const state = {
    entities: {
      task: [
        { id: '20-Tasks/a', type: 'task', slug: 'a', body: '', data: { tags: ['urgent'] } },
        { id: '20-Tasks/b', type: 'task', slug: 'b', body: '', data: { tags: ['urgent', 'frontend'] } },
        { id: '20-Tasks/c', type: 'task', slug: 'c', body: '', data: { tags: [] } }, // no shared tag
      ],
    },
  };
  const g = buildGraph(state);
  eq('tag overlap edge a↔b (urgent)', g.edges.length, 1);
  const e = g.edges[0];
  eq('tag overlap is bidirectional/unordered set', (e.from === '20-Tasks/a' && e.to === '20-Tasks/b') || (e.from === '20-Tasks/b' && e.to === '20-Tasks/a'), true);
  eq('tag overlap reason format', e.reasons, ['#urgent']);
  eq('tag overlap: c has no edges', g.degree['20-Tasks/c'], 0);
}

// ===== multiple reasons on same edge =====
{
  const state = {
    entities: {
      person: [
        { id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[bob]]', data: { tags: ['friend'] } },
        { id: '10-People/bob', type: 'person', slug: 'bob', body: '', data: { tags: ['friend'] } },
      ],
    },
  };
  const g = buildGraph(state);
  eq('multi-reason edge count = 1', g.edges.length, 1);
  eq('multi-reason reasons', g.edges[0].reasons.sort(), ['#friend', 'wikilink']);
}

// ===== self-reference ignored =====
{
  const state = {
    entities: {
      person: [{ id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[alice]]' }],
    },
  };
  const g = buildGraph(state);
  eq('self-reference produces no edge', g.edges.length, 0);
}

// ===== no body field =====
{
  const state = {
    entities: {
      person: [{ id: '10-People/alice', type: 'person', slug: 'alice', data: { tags: ['urgent'] } }],
      person: [{ id: '10-People/bob',   type: 'person', slug: 'bob',   data: { tags: ['urgent'] } }],
    },
  };
  // Fix that — there shouldn't be two `person` keys. Re-write:
}
{
  const state = {
    entities: {
      person: [
        { id: '10-People/alice', type: 'person', slug: 'alice', data: { tags: ['urgent'] } },
        { id: '10-People/bob',   type: 'person', slug: 'bob',   data: { tags: ['urgent'] } },
      ],
    },
  };
  const g = buildGraph(state);
  eq('missing body field still allows tag edges', g.edges.length, 1);
}

// ===== titleOf fallback chain =====
{
  const state = {
    entities: {
      person: [
        { id: '10-People/a', type: 'person', slug: 'a', body: '', data: {} }, // no title
        { id: '10-People/b', type: 'person', slug: 'b', body: '', data: { title: 'B-title' } },
        { id: '10-People/c', type: 'person', slug: 'c', body: '', data: { name: 'C-name' } },
      ],
    },
  };
  const g = buildGraph(state);
  eq('titleOf fallback to slug', g.titleOf(g.byId['10-People/a']), 'a');
  eq('titleOf uses title', g.titleOf(g.byId['10-People/b']), 'B-title');
  eq('titleOf falls back to name', g.titleOf(g.byId['10-People/c']), 'C-name');
  eq('titleOf(null) returns empty', g.titleOf(null), '');
}

// ===== adjacency has reasons as array =====
{
  const state = {
    entities: {
      person: [
        { id: '10-People/alice', type: 'person', slug: 'alice', body: 'see [[bob]]' },
        { id: '10-People/bob',   type: 'person', slug: 'bob',   body: '' },
      ],
    },
  };
  const g = buildGraph(state);
  truthy('adjacency[alice] non-empty', g.adjacency['10-People/alice'].length > 0);
  eq('adjacency[alice][0].other', g.adjacency['10-People/alice'][0].other, '10-People/bob');
  eq('adjacency[alice][0].reasons is array', Array.isArray(g.adjacency['10-People/alice'][0].reasons), true);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
