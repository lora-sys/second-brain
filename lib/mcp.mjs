// MCP (Model Context Protocol) server for Second Brain (v0.11+).
// Implements the stdio transport + JSON-RPC 2.0 protocol.
// Exposes tools for AI clients like Claude Desktop / Codex CLI to
// list/read/create entities in the vault.
//
// Privacy: runs locally. No data leaves the machine unless the user
// uses a remote LLM (out of scope for this server).
//
// Usage: node lib/mcp.mjs
//   (Claude Desktop or any MCP client spawns this as a subprocess)


import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { listResources, readResource } from './mcp-resources.mjs';
import { listPrompts, getPrompt } from './mcp-prompts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------- Helpers ----------

function jsonRpc(id, result) {
  return JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n';
}
function jsonRpcError(id, code, message, data) {
  return JSON.stringify({ jsonrpc: '2.0', id, error: { code, message, data } }) + '\n';
}

function titleOf(entity) {
  return (entity && entity.data && (entity.data.title || entity.data.name)) || entity.slug;
}

async function listEntities(args, vault) {
  const type = (args && args.type) || null;
  const items = type ? await vault.list(type) : await vault.listAll();
  return items.map((it) => ({
    id: it.id,
    type: it.type,
    title: titleOf(it),
    tags: (it.data && it.data.tags) || [],
    updated: (it.data && it.data.updated) || '',
  }));
}

async function getEntity(args, vault) {
  if (!args || !args.id) throw new Error('id required');
  const parsed = vault.parseId(args.id);
  if (!parsed) throw new Error('invalid id format');
  const e = vault.read(parsed.type, parsed.slug);
  return {
    id: e.id,
    type: e.type,
    title: titleOf(e),
    data: e.data,
    body: e.body,
    path: e.path,
  };
}

async function searchEntities(args, vault) {
  if (!args || !args.q) throw new Error('q required');
  const all = vault.listAll();
  const lower = (args.q || '').toLowerCase();
  const matches = all.filter((e) => {
    const fields = [e.data && e.data.title, e.data && e.data.name, e.body, e.slug, ...((e.data && e.data.tags) || [])]
      .filter(Boolean).map((s) => String(s).toLowerCase());
    return fields.some((f) => f.includes(lower));
  });
  return matches.map((it) => ({ id: it.id, type: it.type, title: titleOf(it) }));
}

async function createEntity(args, vault) {
  if (!args || !args.type) throw new Error('type required');
  if (!args.title && !args.name) throw new Error('title or name required');
  const heading = (args.title || args.name || '').trim();
  const slug = await vault.uniqueSlug(args.type, heading);
  const safeData = vault.sanitizeData ? vault.sanitizeData(args.type, args.data || {}) : (args.data || {});
  const written = await vault.write(args.type, slug, {
    data: safeData,
    body: args.body || '',
  });
  return { id: written.id, type: written.type, slug: written.slug, title: heading };
}

// ---------- Server ----------

const TOOLS = [
  {
    name: 'list_entities',
    description: 'List all entities in the Second Brain vault, optionally filtered by type (person, task, project, link, decision).',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by type: person, task, project, link, decision' },
      },
    },
  },
  {
    name: 'get_entity',
    description: 'Get a single entity by its full vault id (e.g. "20-Tasks/buy-groceries").',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Vault id like "type/slug"' },
      },
    },
  },
  {
    name: 'search_entities',
    description: 'Substring search across title, name, body, slug, and tags.',
    inputSchema: {
      type: 'object',
      required: ['q'],
      properties: {
        q: { type: 'string', description: 'Search query (substring match)' },
      },
    },
  },
  {
    name: 'create_entity',
    description: 'Create a new entity in the vault. Returns the new id.',
    inputSchema: {
      type: 'object',
      required: ['type', 'title'],
      properties: {
        type: { type: 'string', description: 'person, task, project, link, or decision' },
        title: { type: 'string', description: 'Title of the new entity' },
        body: { type: 'string', description: 'Markdown body content' },
        data: { type: 'object', description: 'Frontmatter data (tags, status, etc.)' },
      },
    },
  },
];

async function handleToolCall(name, args, vault) {
  switch (name) {
    case 'list_entities': return listEntities(args || {}, vault);
    case 'get_entity': return getEntity(args || {}, vault);
    case 'search_entities': return searchEntities(args || {}, vault);
    case 'create_entity': return await createEntity(args || {}, vault);
    default: throw new Error('unknown tool: ' + name);
  }
}

async function main() {
  // Read config and create a vault instance
  const configPath = path.join(ROOT, 'config.json');
  const cfg = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const { Vault } = await import('./vault.mjs');
  const vault = new Vault({ root: cfg.vaultPath, directories: cfg.directories });

  const rl = createInterface({ input: process.stdin, terminal: false });

  console.error('[mcp] Second Brain MCP server started on stdio');
  console.error('[mcp] Vault: ' + cfg.vaultPath);

  rl.on('line', async (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch (e) {
      console.error('[mcp] ignoring non-JSON line: ' + line.slice(0, 80));
      return;
    }
    const { id, method, params } = msg;

    try {
      if (method === 'initialize') {
        process.stdout.write(jsonRpc(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'second-brain', version: '0.20.0' },
          capabilities: { tools: {}, resources: {}, prompts: {} },
        }));
      } else if (method === 'tools/list') {
        process.stdout.write(jsonRpc(id, { tools: TOOLS }));
      } else if (method === 'tools/call') {
        const { name, arguments: args } = params || {};
        const result = await handleToolCall(name, args, vault);
        process.stdout.write(jsonRpc(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }));
      } else if (method === 'notifications/initialized') {
        // No response for notifications
      } else if (method === 'resources/list') {
        process.stdout.write(jsonRpc(id, { resources: listResources() }));
      } else if (method === 'resources/read') {
        const { uri } = params || {};
        try {
          const text = await readResource(uri, vault);
          process.stdout.write(jsonRpc(id, { contents: [{ uri, mimeType: 'application/json', text }] }));
        } catch (e) {
          process.stdout.write(jsonRpcError(id, -32602, e.message || String(e)));
        }
      } else if (method === 'prompts/list') {
        process.stdout.write(jsonRpc(id, { prompts: listPrompts() }));
      } else if (method === 'prompts/get') {
        const { name, arguments: promptArgs } = params || {};
        try {
          const result = getPrompt(name, promptArgs);
          process.stdout.write(jsonRpc(id, result));
        } catch (e) {
          process.stdout.write(jsonRpcError(id, -32602, e.message || String(e)));
        }
      } else if (method === 'ping') {
        process.stdout.write(jsonRpc(id, {}));
      } else {
        process.stdout.write(jsonRpcError(id, -32601, 'method not found: ' + method));
      }
    } catch (err) {
      process.stdout.write(jsonRpcError(id, -32603, err.message || String(err)));
    }
  });
}

main().catch((err) => {
  console.error('[mcp] fatal: ' + err.message);
  process.exit(1);
});
