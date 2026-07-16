// HTTP server for the second-brain dashboard.
// All operations go through the Obsidian vault as markdown files.

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Vault, TYPES } from './vault.mjs';
import { fetchLight, fetchDeep } from './linkfetch.mjs';
import { slugify } from './frontmatter.mjs';
import { EventStore } from './eventstore.mjs';
import { generateDaily, writeDaily, readRecentJournals } from './daily.mjs';
import { generateWeekly, writeWeekly, readRecentWeeklies, findStaleTasksFromVault } from './weekly.mjs';
import { listSkills, readSkill, writeSkill, matchSkills } from './skills.mjs';
import { FsWatcher } from './fswatcher.mjs';

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
  // v0.18 — LLM settings managed via in-app config panel (ADR-0008).
  // Empty values fall through to process env vars (OPENAI_API_KEY etc.).
  llm: {
    apiKey: '',
    baseUrl: '',
    model: '',
  },
};

// Mask an API key for safe client display. Format: "••••••••xxxx" where
// xxxx are the trailing 4 chars. Empty string stays empty. Keys that
// don't have at least 4 chars get fully masked.
export function maskApiKey(k) {
  if (typeof k !== 'string' || k.length === 0) return '';
  if (k.length <= 4) return '••••';
  return '••••••••' + k.slice(-4);
}

// Build the redacted config object that's safe to return from GET /api/config.
export function redactConfig(cfg) {
  if (!cfg || !cfg.llm) return cfg;
  const apiKey = cfg.llm.apiKey || '';
  return {
    ...cfg,
    llm: {
      apiKey: maskApiKey(apiKey),
      configured: apiKey.length > 0,
      baseUrl: cfg.llm.baseUrl || '',
      model: cfg.llm.model || '',
    },
  };
}

export function getLlmOpts(cfg) {
  // Plain (un-redacted) llm opts used by server-side provider creation.
  // Empty strings fall through to env at provider creation time.
  if (!cfg || !cfg.llm) return {};
  return {
    apiKey: cfg.llm.apiKey || '',
    baseURL: cfg.llm.baseUrl || '',
    model: cfg.llm.model || '',
  };
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_CONFIG, ...parsed, directories: { ...DEFAULT_CONFIG.directories, ...(parsed.directories || {}) } };
    merged.llm = { ...DEFAULT_CONFIG.llm, ...(parsed.llm || {}) };
    return merged;
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

const ENTITY_TYPES = ['person', 'task', 'project', 'link', 'decision'];

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
  if (type === 'decision' && !out.status) out.status = 'pending';
  if (type === 'decision' && !out.madeAt) out.madeAt = new Date().toISOString();
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

async function handleCreate(req, res, vault, events) {
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
  if (events) {
    await events.append(`${type}.created`, { id: written.id, slug, title: heading });
  }
  jsonResponse(res, 201, written);
}

async function handleUpdate(req, res, vault, id, events) {
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
  const oldStatus = current.data && current.data.status;
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
  if (events) {
    // Detect status transitions (e.g. task.open → task.done)
    const newStatus = safeData.status;
    if (parsed.type === 'task' && oldStatus !== newStatus && newStatus) {
      await events.append(`task.${newStatus}`, { id: written.id, slug: nextSlug, from: oldStatus, to: newStatus });
    } else {
      await events.append(`${parsed.type}.updated`, { id: written.id, slug: nextSlug });
    }
  }
  jsonResponse(res, 200, written);
}

async function handleDelete(req, res, vault, id, events) {
  const parsed = vault.parseId(id);
  if (!parsed) return errorResponse(res, 400, `Invalid id: ${id}`);
  try {
    await vault.delete(parsed.type, parsed.slug);
    if (events) {
      await events.append(`${parsed.type}.deleted`, { id, slug: parsed.slug });
    }
    jsonResponse(res, 200, { ok: true });
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    errorResponse(res, 500, err.message);
  }
}

// Weighted search. Returns items sorted by score (desc).
// Scoring:
//   - title/name exact match: 100
//   - title/name contains: 30
//   - slug exact: 20
//   - tag exact match: 25
//   - tag contains: 10
//   - body contains: 5 per match (capped at 30)
//   - recency boost: +1 per day since updated, capped at +10
// Multi-token: all tokens must match somewhere in the entity (AND semantics).
function scoreEntity(e, tokens) {
  const data = e.data || {};
  const title = String(data.title || data.name || '').toLowerCase();
  const body = String(e.body || '').toLowerCase();
  const slug = String(e.slug || '').toLowerCase();
  const tags = (data.tags || []).map(t => String(t).toLowerCase());
  let score = 0;
  for (const tok of tokens) {
    let tokenMatched = false;
    if (title === tok) { score += 100; tokenMatched = true; }
    else if (title.includes(tok)) { score += 30; tokenMatched = true; }
    if (slug === tok) { score += 20; tokenMatched = true; }
    else if (slug.includes(tok)) { score += 5; tokenMatched = true; }
    for (const tag of tags) {
      if (tag === tok) { score += 25; tokenMatched = true; }
      else if (tag.includes(tok)) { score += 10; tokenMatched = true; }
    }
    // Body matches (cap at 30 per token)
    const bodyMatches = (body.match(new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (bodyMatches > 0) { score += Math.min(30, bodyMatches * 5); tokenMatched = true; }
    if (!tokenMatched) return 0; // AND semantics: any token not matching kills the score
  }
  // Recency boost
  const upd = data.updated;
  if (upd) {
    const t = new Date(upd).getTime();
    if (!isNaN(t)) {
      const daysAgo = (Date.now() - t) / 86400000;
      if (daysAgo >= 0) score += Math.max(0, 10 - Math.floor(daysAgo));
    }
  }
  return score;
}

async function handleSearch(req, res, vault) {
  const q = (new URL(req.url, 'http://x').searchParams.get('q') || '').trim();
  if (!q) return jsonResponse(res, 200, { items: [], total: 0 });
  // Multi-token: split on whitespace
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return jsonResponse(res, 200, { items: [], total: 0 });
  const all = await vault.listAll();
  const scored = [];
  for (const e of all) {
    const s = scoreEntity(e, tokens);
    if (s > 0) scored.push({ entity: e, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  // Cap at 50 results
  const top = scored.slice(0, 50);
  jsonResponse(res, 200, {
    items: top.map(x => x.entity),
    scores: top.map(x => x.score),
    total: scored.length,
  });
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
    .sort((a, b) => String(a.data.due || '').localeCompare(String(b.data.due || '')))
    .slice(0, 8);
  const recent = [...people, ...tasks, ...projects, ...links]
    .sort((a, b) => String(b.data.updated || '').localeCompare(String(a.data.updated || '')))
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

async function handleImportLink(req, res, vault, events) {
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
  if (events) {
    await events.append('link.imported', {
      id: written.id,
      slug,
      url: finalUrl,
      title,
      fetchStatus: info ? 'ok' : 'failed',
      fetchMode: deep ? 'deep' : 'light',
    });
  }
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

// --- skills (v0.9) ---
async function handleSkillsList(req, res) {
  const cfg = await getConfig();
  const skills = await listSkills(cfg.vaultPath);
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q');
  if (q) {
    return jsonResponse(res, 200, { skills: matchSkills(skills, q) });
  }
  jsonResponse(res, 200, { skills });
}

async function handleSkillRead(req, res, slug) {
  const cfg = await getConfig();
  const skill = await readSkill(cfg.vaultPath, slug);
  if (!skill) return errorResponse(res, 404, 'Not found');
  jsonResponse(res, 200, skill);
}

async function handleSkillDelete(req, res, slug) {
  const cfg = await getConfig();
  const fs2 = require('node:fs').promises;
  const file = path.join(cfg.vaultPath, '00-AI', 'skills', slug + '.md');
  try {
    await fs2.unlink(file);
    jsonResponse(res, 200, { ok: true, slug });
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    errorResponse(res, 500, err.message);
  }
}

async function handleSkillCreate(req, res) {
  const body = await readBody(req);
  const { slug, name, description, tags, body: text } = body;
  if (!slug) return errorResponse(res, 400, 'slug required');
  const cfg = await getConfig();
  try {
    const written = await writeSkill(cfg.vaultPath, { slug, name, description, tags, body: text });
    jsonResponse(res, 201, { ok: true, slug, path: written });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
}

// --- weekly reflection (v0.7) ---
async function handleWeeklyList(req, res) {
  const cfg = await getConfig();
  const weeklies = await readRecentWeeklies(cfg.vaultPath, 12);
  // Load each weekly body and include the first 200 chars for dashboard previews
  const enriched = [];
  for (const w of weeklies) {
    try {
      const raw = await fs.readFile(w.path, 'utf8');
      const bodyMatch = raw.match(/^---[\s\S]*?---\n([\s\S]*)$/);
      const body = bodyMatch ? bodyMatch[1].slice(0, 400) : '';
      enriched.push({ ...w, body });
    } catch {
      enriched.push(w);
    }
  }
  jsonResponse(res, 200, { weeklies: enriched });
}

async function handleWeeklyRead(req, res, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse(res, 400, 'Invalid date format (YYYY-MM-DD)');
  }
  const cfg = await getConfig();
  const file = path.join(cfg.vaultPath, '00-Weekly', `${date}.md`);
  try {
    const content = await fs.readFile(file, 'utf8');
    jsonResponse(res, 200, { date, content, path: file });
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    errorResponse(res, 500, err.message);
  }
}

async function handleWeeklyGenerate(req, res, events, vault) {
  const cfg = await getConfig();
  const eventsByDay = await events.readLastNDays(7);
  const staleTasks = await findStaleTasksFromVault(vault, 7);
  const dateStr = new Date().toISOString().slice(0, 10);
  try {
    const { content, provider } = await generateWeekly({ date: dateStr, eventsByDay, staleTasks, vaultPath: cfg.vaultPath, llm: getLlmOpts(cfg) });
    const written = await writeWeekly(cfg.vaultPath, dateStr, content);
    await events.append('weekly.generated', { date: dateStr, path: written, staleTasks: staleTasks.length, provider: provider.name });
    jsonResponse(res, 201, { ok: true, date: dateStr, path: written, content, provider, staleTasks });
  } catch (err) {
    errorResponse(res, 500, `Weekly generation failed: ${err.message}`);
  }
}

// --- events ---
async function handleDailyGenerate(req, res, events, vault) {
  // Generate a daily journal from recent events.
  const body = await readBody(req).catch(() => ({}));
  const days = Math.min(30, Math.max(1, parseInt(body.days || '1', 10)));
  const dateStr = body.date || formatDate(new Date());
  // Resolve vault root for writeDaily
  const cfg = await getConfig();
  const eventsByDay = await events.readLastNDays(days);
  const recentJournals = await readRecentJournals(cfg.vaultPath, 5);
  try {
    const { content, provider } = await generateDaily({ date: dateStr, eventsByDay, recentJournals, llm: getLlmOpts(cfg) });
    const written = await writeDaily(cfg.vaultPath, dateStr, content);
    // Emit a meta-event so the daily itself shows up in the event stream
    await events.append('daily.generated', { date: dateStr, path: written, provider: provider.name });
    jsonResponse(res, 201, { ok: true, date: dateStr, path: written, content, provider });
  } catch (err) {
    errorResponse(res, 500, `Daily generation failed: ${err.message}`);
  }
}

async function handleDailyList(req, res) {
  const cfg = await getConfig();
  const journals = await readRecentJournals(cfg.vaultPath, 30);
  jsonResponse(res, 200, { journals });
}

async function handleDailyRead(req, res, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse(res, 400, 'Invalid date format (YYYY-MM-DD)');
  }
  const cfg = await getConfig();
  const file = path.join(cfg.vaultPath, '00-Daily', `${date}.md`);
  try {
    const content = await fs.readFile(file, 'utf8');
    jsonResponse(res, 200, { date, content, path: file });
  } catch (err) {
    if (err.code === 'ENOENT') return errorResponse(res, 404, 'Not found');
    errorResponse(res, 500, err.message);
  }
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function handleListEvents(req, res, events) {
  const url = new URL(req.url, 'http://x');
  const days = parseInt(url.searchParams.get('days') || '7', 10);
  const data = await events.readLastNDays(Math.min(30, Math.max(1, days)));
  const flat = [];
  for (const { date, events: dayEvents } of data) {
    for (const e of dayEvents) flat.push({ ...e, date });
  }
  jsonResponse(res, 200, { events: flat, days });
}

// --- router ---
async function route(req, res) {
  try {
  const url = new URL(req.url, 'http://x');
  const pathname = url.pathname;
  const method = req.method;

    // Config endpoints (don't require vault)
    if (pathname === '/api/config' && method === 'GET') {
      const cfg = await getConfig();
      // v0.18 — redact the API key before returning (maskApiKey + configured flag).
      return jsonResponse(res, 200, redactConfig(cfg));
    }
    if (pathname === '/api/config' && method === 'PUT') {
      const body = await readBody(req);
      const current = await getConfig();
      // v0.18 — handle llm.{apiKey, baseUrl, model}. An empty-string field is
      // an explicit clear; a missing field leaves the existing value. Body
      // `apiKey === mask` is treated as "no change" so the UI echoing the
      // masked value doesn't wipe the real key.
      const incomingLlm = body.llm || {};
      const existingLlm = (current.llm) || {};
      const nextLlm = {
        apiKey: existingLlm.apiKey || '',
        baseUrl: existingLlm.baseUrl || '',
        model: existingLlm.model || '',
      };
      // The UI also exposes a `clearApiKey: true` flag — used by the "清除" button.
      if (incomingLlm.clearApiKey === true) {
        nextLlm.apiKey = '';
      } else if (Object.prototype.hasOwnProperty.call(incomingLlm, 'apiKey')) {
        const v = String(incomingLlm.apiKey || '');
        // If the incoming value already looks like our mask (• + 4 chars), ignore it.
        if (v.length === 0) {
          nextLlm.apiKey = ''; // explicit clear
        } else if (/^•{4,}/.test(v)) {
          // masked; keep existing
        } else {
          nextLlm.apiKey = v;
        }
      }
      if (Object.prototype.hasOwnProperty.call(incomingLlm, 'baseUrl')) {
        nextLlm.baseUrl = String(incomingLlm.baseUrl || '');
      }
      if (Object.prototype.hasOwnProperty.call(incomingLlm, 'model')) {
        nextLlm.model = String(incomingLlm.model || '');
      }
      const next = {
        ...current,
        ...body,
        directories: { ...current.directories, ...(body.directories || {}) },
        llm: nextLlm,
      };
      await saveConfig(next);
      cachedConfig = next;
      return jsonResponse(res, 200, redactConfig(next));
    }

    if (pathname === '/api/health') {
      return jsonResponse(res, 200, { ok: true, ts: Date.now() });
    }
    // v0.18 — LLM connection test. Reads the current config and asks the
    // configured provider to emit a tiny "hi"-class completion. Returns
    // 200 with provider info on success, 400/500 on misconfig/network.
    if (pathname === '/api/llm/test' && method === 'POST') {
      try {
        const cfg = await getConfig();
        const llmOpts = getLlmOpts(cfg);
        // Local-echo path: no key needed
        if (!llmOpts.apiKey && !llmOpts.baseURL) {
          return jsonResponse(res, 200, {
            ok: true,
            provider: { name: 'local-echo', model: 'deterministic-stub', isLocal: true },
            note: 'No apiKey/baseUrl configured. Generation will use local-echo. Use this endpoint only after configuring an API key to confirm network reachability.',
          });
        }
        // Build provider dynamically so we honour the latest config (no cache).
        const { createOpenAIProvider } = await import('./llm/openai.mjs');
        const { CachedProvider } = await import('./llm/index.mjs');
        const provider = new CachedProvider(createOpenAIProvider(llmOpts), { ttlMs: 0 });
        const result = await provider.complete({ system: 'Reply with the single word "ok".', prompt: 'ping', maxTokens: 8, temperature: 0 });
        const info = provider.info();
        return jsonResponse(res, 200, { ok: true, provider: info, sample: (result && result.content) || '' });
      } catch (err) {
        return jsonResponse(res, 502, { ok: false, error: err.message || String(err) });
      }
    }

    // All other API endpoints need a configured vault.
    const cfg = await getConfig();
    if (!cfg.vaultPath) {
      return errorResponse(res, 409, 'Vault not configured. Set vaultPath in config.json or PUT /api/config.');
    }
    const vault = vaultFromConfig(cfg);
    const events = new EventStore(cfg.vaultPath);
    await events.init();
    // Start the FS watcher (idempotent — guarded inside FsWatcher)
    if (!globalThis.__sbFsWatcher) {
      const watcher = new FsWatcher(cfg.vaultPath, events);
      await watcher.start();
      globalThis.__sbFsWatcher = watcher;
    }

    if (pathname === '/api/entities' && method === 'GET') return handleListAll(req, res, vault);
    if (pathname === '/api/events' && method === 'GET') return handleListEvents(req, res, events);
    if (pathname === '/api/daily' && method === 'GET') return handleDailyList(req, res);
    if (pathname === '/api/weekly' && method === 'GET') return handleWeeklyList(req, res);
    if (pathname === '/api/skills' && method === 'GET') return handleSkillsList(req, res);
    if (pathname === '/api/skills' && method === 'POST') return handleSkillCreate(req, res);
    if (pathname.startsWith('/api/skills/') && method === 'GET') {
      const slug = pathname.slice('/api/skills/'.length);
      return handleSkillRead(req, res, slug);
    }
    if (pathname.startsWith('/api/skills/') && method === 'DELETE') {
      const slug = pathname.slice('/api/skills/'.length);
      return handleSkillDelete(req, res, slug);
    }
    if (pathname === '/api/weekly' && method === 'POST') return handleWeeklyGenerate(req, res, events, vault);
    if (pathname.startsWith('/api/weekly/') && method === 'GET') {
      const date = pathname.slice('/api/weekly/'.length);
      return handleWeeklyRead(req, res, date);
    }
    if (pathname === '/api/daily' && method === 'POST') return handleDailyGenerate(req, res, events, vault);
    if (pathname.startsWith('/api/daily/') && method === 'GET') {
      const date = pathname.slice('/api/daily/'.length);
      return handleDailyRead(req, res, date);
    }
    if (pathname === '/api/entities' && method === 'POST') return handleCreate(req, res, vault, events);
    if (pathname.startsWith('/api/entities/')) {
      const id = decodeURIComponent(pathname.slice('/api/entities/'.length));
      if (method === 'GET') return handleRead(req, res, vault, id);
      if (method === 'PUT') return handleUpdate(req, res, vault, id, events);
      if (method === 'DELETE') return handleDelete(req, res, vault, id, events);
    }
    if (pathname === '/api/search' && method === 'GET') return handleSearch(req, res, vault);
    if (pathname === '/api/dashboard' && method === 'GET') return handleDashboard(req, res, vault);
    if (pathname === '/api/links/import' && method === 'POST') return handleImportLink(req, res, vault, events);
    if (pathname === '/api/links/light' && method === 'POST') return handleLightFetch(req, res);

    return errorResponse(res, 404, `Not found: ${method} ${pathname}`);
  } catch (err) {
    console.error('[api] error:', err);
    try { errorResponse(res, 500, err.message || 'Internal error'); } catch {}
  }
}

// Final defensive catch so a sync throw in a handler doesn't crash the process.
process.on('uncaughtException', (err) => {
  console.error('[api] uncaught:', err);
});

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
