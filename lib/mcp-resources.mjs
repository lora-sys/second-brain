// v0.20 — MCP Resources (read-only data exposed to AI clients).
//
// Resources are identified by URI. Each resource returns its content
// as text/json. URI scheme: "vault://<name>". An AI client surfaces
// these as files an LLM can read.
//
// Privacy: same as the rest of MCP — local only. The user can read but
// the client cannot edit through resources (that's what tools are for).

import { listSkills } from './skills.mjs';
import { buildGraph } from './graph.mjs';

const RESOURCES = [
  {
    uri: 'vault://entities',
    name: 'All entities (index)',
    description: 'List of every entity in the vault: id, type, title, tags, updated. Markdown-friendly JSON.',
    mimeType: 'application/json',
  },
  {
    uri: 'vault://recent',
    name: 'Recently updated entities',
    description: 'Entities updated in the last 7 days, sorted by updated desc.',
    mimeType: 'application/json',
  },
  {
    uri: 'vault://tags',
    name: 'Tag cloud',
    description: 'Tag → entity-count mapping across the whole vault.',
    mimeType: 'application/json',
  },
  {
    uri: 'vault://graph',
    name: 'Knowledge graph',
    description: 'Nodes + edges for the wikilink + tag-overlap graph. Uses lib/graph.mjs.',
    mimeType: 'application/json',
  },
  {
    uri: 'vault://skills',
    name: 'Skills index',
    description: 'Skills available to the cockpit agent (slug, name, description, tags).',
    mimeType: 'application/json',
  },
];

export function listResources() {
  return RESOURCES.slice();
}

function projectItem(e) {
  return {
    id: e.id,
    type: e.type,
    title: (e.data && (e.data.title || e.data.name)) || e.slug,
    tags: (e.data && e.data.tags) || [],
    updated: (e.data && e.data.updated) || '',
  };
}

export async function readResource(uri, vault) {
  switch (uri) {
    case 'vault://entities': {
      const items = await vault.listAll();
      return JSON.stringify({ count: items.length, items: items.map(projectItem) }, null, 2);
    }
    case 'vault://recent': {
      const items = await vault.listAll();
      const dayMs = 86400000;
      const horizon = Date.now() - 7 * dayMs;
      const recent = items
        .filter((e) => {
          const u = (e.data && e.data.updated) || '';
          if (!u) return false;
          const t = new Date(u).getTime();
          return !isNaN(t) && t >= horizon;
        })
        .sort((a, b) => ((b.data && b.data.updated) || '').localeCompare((a.data && a.data.updated) || ''));
      return JSON.stringify({ count: recent.length, items: recent.map(projectItem) }, null, 2);
    }
    case 'vault://tags': {
      const items = await vault.listAll();
      const counts = {};
      for (const it of items) {
        for (const t of (it.data && it.data.tags) || []) {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return JSON.stringify({ tags: Object.fromEntries(sorted), total: Object.keys(counts).length }, null, 2);
    }
    case 'vault://graph': {
      const items = await vault.listAll();
      const grouped = { person: [], task: [], project: [], link: [], decision: [] };
      for (const it of items) {
        const t = it.type || 'person';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(it);
      }
      const g = buildGraph({ entities: grouped });
      // Slim the result: drop closures, keep serializable parts.
      return JSON.stringify({
        nodes: g.nodes.map((n) => ({
          id: n.id,
          type: n._type,
          title: (n.data && (n.data.title || n.data.name)) || n.slug,
        })),
        edges: g.edges.map((e) => ({ from: e.from, to: e.to, reasons: e.reasons })),
        hubs: g.hubs.slice(0, 20).map((h) => ({
          id: h.id,
          type: h._type,
          title: (h.data && (h.data.title || h.data.name)) || h.slug,
          degree: g.degree[h.id] || 0,
        })),
      }, null, 2);
    }
    case 'vault://skills': {
      const skills = await listSkills(vault.root || (vault.cfg && vault.cfg.vaultPath));
      return JSON.stringify({
        count: skills.length,
        skills: skills.map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description,
          tags: s.tags || [],
        })),
      }, null, 2);
    }
    default:
      throw new Error('unknown resource: ' + uri);
  }
}
