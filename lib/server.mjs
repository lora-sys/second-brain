// HTTP server for the second-brain dashboard.
// All operations go through the Obsidian vault as markdown files.

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Vault, TYPES } from './vault.mjs';
import { fetchLight, fetchDeep } from './linkfetch.mjs';
import { slugify } from './frontmatter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CONFIG_PATH = path.join(ROOT, 'config.json');

const DEFAULT_CONFIG = {
  vaultPath: '',
  port: 3939,
  host: '127.0.0.1',
  directories: {
    person: '10-People',
    task: '20-Tasks',
    project: '30-Projects',
    link: '40-Links',
    dashboard: '00-Dashboard',
  },
};

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed, directories: { ...DEFAULT_CONFIG.directories, ...(parsed.directories || {}) } };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig(cfg) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

let cachedConfig = null;
async function getConfig() {
  if (!cachedConfig) cachedConfig = await loadConfig();
  return cachedConfig;
}

function vaultFromConfig(cfg) {
  if (!cfg.vaultPath) throw new Error('vaultPath is not configured');
  return new Vault({ root: cfg.vaultPath, directories: cfg.directories });
}

const ENTITY_TYPES = ['person', 'task', 'project', 'link'];

// --- helpers ---
function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function errorResponse(res, status, message, details) {
  jsonResponse(res, status, { error: message, details: details || null });
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 4 * 1024 * 1024) throw new Error('Body too large');
    chunks.push(chunk);
  }
  if (total === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }
}

function sanitizeData(type, data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;
    out[k] = v;
  }
  // Type-specific defaults.
  if (type === 'person' && !out.status) out.status = 'active';
  if (type === 'task' && !out.status) out.status = 'todo';
  if (type === 'task' && !out.priority) out.priority = 'medium';
  if (type === 'project' && !out.status) out.status = 'active';
  return out;
}

// --- handlers ---
async function handleListAll(req, res, vault) {
  const type = new URL(req.url, 'http://x').searchParams.get('type');
  if (type && !ENTITY_TYPES.includes(type)) {
    return errorResponse(res, 400, `Unknown type: ${type}`);
  }
  const items = type ? await vault.list(type) : await vault.listAll();
  jsonResponse(res, 200, { items });
}

async function handleRead(req, res, vault, id) {
  const parsed = vault.parseId(id);
  if (!parsed) return errorResponse(res, 400, `Invalid id: ${id}`);
  try {
    const entity = await vault.read(parsed.type, parsed.slug);
    jsonResponse(res, 200, entity);
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    errorResponse(res, 500, err.message);
  }
}

async function handleCreate(req, res, vault) {
  const body = await readBody(req);
  const { type, title, name, data = {}, body: bodyText = '' } = body;
  if (!ENTITY_TYPES.includes(type)) return errorResponse(res, 400, 'Invalid type');
  const heading = (title || name || '').trim();
  if (!heading) return errorResponse(res, 400, 'title or name is required');
  const slug = await vault.uniqueSlug(type, heading);
  const safeData = sanitizeData(type, data);
  // Default frontmatter per type
  if (type === 'person') {
    safeData.name = safeData.name || heading;
    safeData.type = 'person';
  } else {
    safeData.title = safeData.title || heading;
    safeData.type = type;
  }
  const written = await vault.write(type, slug, { data: safeData, body: bodyText });
  jsonResponse(res, 201, written);
}

async function handleUpdate(req, res, vault, id) {
  const parsed = vault.parseId(id);
  if (!parsed) return errorResponse(res, 400, `Invalid id: ${id}`);
  const body = await readBody(req);
  const { data = {}, body: bodyText, renameTo } = body;
  let current;
  try {
    current = await vault.read(parsed.type, parsed.slug);
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    throw err;
  }
  const safeData = sanitizeData(parsed.type, { ...current.data, ...data });
  const nextSlug = renameTo ? slugify(renameTo) : parsed.slug;
  const written = await vault.write(parsed.type, nextSlug, {
    data: safeData,
    body: bodyText !== undefined ? bodyText : current.body,
  });
  if (nextSlug !== parsed.slug) {
    // If renamed, remove the old file.
    await vault.delete(parsed.type, parsed.slug).catch(() => {});
  }
  jsonResponse(res, 200, written);
}

async function handleDelete(req, res, vault, id) {
  const parsed = vault.parseId(id);
  if (!parsed) return errorResponse(res, 400, `Invalid id: ${id}`);
  try {
    await vault.delete(parsed.type, parsed.slug);
    jsonResponse(res, 200, { ok: true });
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    errorResponse(res, 500, err.message);
  }
}

async function handleSearch(req, res, vault) {
  const q = (new URL(req.url, 'http://x').searchParams.get('q') || '').trim();
  if (!q) return jsonResponse(res, 200, { items: [] });
  const lower = q.toLowerCase();
  const all = await vault.listAll();
  const matches = all.filter((e) => {
    const fields = [e.data?.title, e.data?.name, e.body, e.slug, ...(e.data?.tags || [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    return fields.some((f) => f.includes(lower));
  });
  jsonResponse(res, 200, { items: matches });
}

async function handleDashboard(req, res, vault) {
  const [people, tasks, projects, links] = await Promise.all([
    vault.list('person'),
    vault.list('task'),
    vault.list('project'),
    vault.list('link'),
  ]);
  const due = tasks
    .filter((t) => t.data.status !== 'done' && t.data.status !== 'cancelled' && t.data.due)
    .sort((a, b) => (a.data.due || '').localeCompare(b.data.due || ''))
    .slice(0, 8);
  const recent = [...people, ...tasks, ...projects, ...links]
    .sort((a, b) => (b.data.updated || '').localeCompare(a.data.updated || ''))
    .slice(0, 10);
  const byStatus = {
    todo: tasks.filter((t) => t.data.status === 'todo').length,
    in_progress: tasks.filter((t) => t.data.status === 'in_progress').length,
    done: tasks.filter((t) => t.data.status === 'done').length,
    cancelled: tasks.filter((t) => t.data.status === 'cancelled').length,
  };
  const tags = {};
  for (const e of [...people, ...tasks, ...projects, ...links]) {
    for (const tag of e.data?.tags || []) {
      tags[tag] = (tags[tag] || 0) + 1;
    }
  }
  jsonResponse(res, 200, {
    counts: {
      person: people.length,
      task: tasks.length,
      project: projects.length,
      link: links.length,
    },
    tasksByStatus: byStatus,
    dueTasks: due,
    recent,
    tags,
  });
}

async function handleImportLink(req, res, vault) {
  const body = await readBody(req);
  const rawUrl = body.url;
  const deep = !!body.deep;
  const titleOverride = (body.title || '').trim();
  const tags = Array.isArray(body.tags) ? body.tags : [];
  if (!rawUrl) return errorResponse(res, 400, 'url is required');
  // Normalize URL early so we always have a valid value even if fetch fails.
  let finalUrl = rawUrl;
  try {
    finalUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    new URL(finalUrl);
  } catch (err) {
    return errorResponse(res, 400, `Invalid URL: ${err.message}`);
  }
  let info = null;
  let fetchError = null;
  try {
    info = deep ? await fetchDeep(finalUrl) : await fetchLight(finalUrl);
    if (info?.finalUrl) finalUrl = info.finalUrl;
  } catch (err) {
    fetchError = err.message || String(err);
  }
  const title = titleOverride || info?.title || finalUrl;
  const slug = await vault.uniqueSlug('link', title);
  const stamp = new Date().toISOString();
  const data = {
    type: 'link',
    title,
    url: finalUrl,
    site: info?.siteName || '',
    description: info?.description || '',
    cover: info?.cover || '',
    favicon: info?.favicon || '',
    fetchedAt: stamp,
    fetchMode: deep ? 'deep' : 'light',
    fetchStatus: info ? 'ok' : 'failed',
    fetchError: fetchError || '',
    tags,
  };
  const bodyText = info && deep && info.content ? info.content : '';
  const written = await vault.write('link', slug, { data, body: bodyText });
  jsonResponse(res, info ? 201 : 202, written);
}

async function handleLightFetch(req, res) {
  const body = await readBody(req);
  if (!body.url) return errorResponse(res, 400, 'url is required');
  try {
    const info = await fetchLight(body.url);
    jsonResponse(res, 200, info);
  } catch (err) {
    errorResponse(res, 502, `Fetch failed: ${err.message}`);
  }
}

// --- router ---
async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  const pathname = url.pathname;
  const method = req.method;

  try {
    // Config endpoints (don't require vault)
    if (pathname === '/api/config' && method === 'GET') {
      const cfg = await getConfig();
      return jsonResponse(res, 200, cfg);
    }
    if (pathname === '/api/config' && method === 'PUT') {
      const body = await readBody(req);
      const current = await getConfig();
      const next = {
        ...current,
        ...body,
        directories: { ...current.directories, ...(body.directories || {}) },
      };
      await saveConfig(next);
      cachedConfig = next;
      return jsonResponse(res, 200, next);
    }

    if (pathname === '/api/health') {
      return jsonResponse(res, 200, { ok: true, ts: Date.now() });
    }

    // All other API endpoints need a configured vault.
    const cfg = await getConfig();
    if (!cfg.vaultPath) {
      return errorResponse(res, 409, 'Vault not configured. Set vaultPath in config.json or PUT /api/config.');
    }
    const vault = vaultFromConfig(cfg);

    if (pathname === '/api/entities' && method === 'GET') return handleListAll(req, res, vault);
    if (pathname === '/api/entities' && method === 'POST') return handleCreate(req, res, vault);
    if (pathname.startsWith('/api/entities/')) {
      const id = decodeURIComponent(pathname.slice('/api/entities/'.length));
      if (method === 'GET') return handleRead(req, res, vault, id);
      if (method === 'PUT') return handleUpdate(req, res, vault, id);
      if (method === 'DELETE') return handleDelete(req, res, vault, id);
    }
    if (pathname === '/api/search' && method === 'GET') return handleSearch(req, res, vault);
    if (pathname === '/api/dashboard' && method === 'GET') return handleDashboard(req, res, vault);
    if (pathname === '/api/links/import' && method === 'POST') return handleImportLink(req, res, vault);
    if (pathname === '/api/links/light' && method === 'POST') return handleLightFetch(req, res);

    return errorResponse(res, 404, `Not found: ${method} ${pathname}`);
  } catch (err) {
    console.error('[api] error:', err);
    errorResponse(res, 500, err.message || 'Internal error');
  }
}

// --- static file serving ---
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  // Prevent path traversal.
  const safe = path
    .normalize(pathname)
    .replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return errorResponse(res, 403, 'Forbidden');
  }
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      const buf = await fs.readFile(index);
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(buf);
    }
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(buf);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // SPA fallback: serve index.html for unknown non-API paths.
      const idx = path.join(PUBLIC_DIR, 'index.html');
      try {
        const buf = await fs.readFile(idx);
        res.writeHead(200, { 'content-type': MIME['.html'] });
        return res.end(buf);
      } catch {}
      return errorResponse(res, 404, 'Not found');
    }
    errorResponse(res, 500, err.message);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    return route(req, res);
  }
  return serveStatic(req, res);
});

export { server, getConfig, saveConfig };

export async function start() {
  const cfg = await getConfig();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(cfg.port, cfg.host, () => resolve());
  });
  console.log(`[second-brain] http://${cfg.host}:${cfg.port}`);
  console.log(`[second-brain] vault: ${cfg.vaultPath || '(not configured)'}`);
}
