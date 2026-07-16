// Daily journal generator (v0.5+).
//
// Reads events from the EventStore, summarises them with an LLM
// (LocalEcho by default, OpenAI-compatible when configured), and
// writes a markdown file to vaultRoot/00-Daily/YYYY-MM-DD.md.
//
// Privacy: the LLM sees only the event summaries, not the full vault
// content. For LocalEcho, nothing leaves the machine.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { LocalEchoProvider, CachedProvider } from './llm/index.mjs';
import { createOpenAIProvider } from './llm/openai.mjs';

const DAILY_DIRNAME = '00-Daily';

// Pick the right provider based on environment.
// v0.18 — pickProvider accepts LLM opts merged with env (ADR-0008). Order:
//   1. opts.apiKey / opts.baseURL / opts.model from caller (server, plumbed from config)
//   2. process.env.OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL
//   3. built-in defaults inside createOpenAIProvider
export function pickProvider(opts = {}) {
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY || '';
  const baseURL = opts.baseURL || opts.baseUrl || process.env.OPENAI_BASE_URL || '';
  const model   = opts.model   || process.env.OPENAI_MODEL   || '';
  if (apiKey || baseURL) {
    try {
      const provider = createOpenAIProvider({ apiKey, baseURL, model });
      return new CachedProvider(provider, { ttlMs: 60_000 });
    } catch (err) {
      console.warn('[daily] failed to create OpenAI provider, falling back to local-echo:', err.message);
    }
  }
  return new LocalEchoProvider();
}

// Format an array of events into a compact summary for the LLM.
function summariseEvents(eventsByDay) {
  const lines = [];
  let totalEvents = 0;
  const typeCounts = {};
  for (const { date, events } of eventsByDay) {
    if (events.length === 0) continue;
    lines.push(`\n## ${date}`);
    for (const e of events) {
      totalEvents++;
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      const parts = [e.type];
      if (e.title) parts.push(`"${e.title}"`);
      if (e.from && e.to) parts.push(`(${e.from} → ${e.to})`);
      if (e.url) parts.push(`url=${e.url}`);
      if (e.path) parts.push(`path=${e.path}`);
      lines.push(`- ${parts.join(' ')}`);
    }
  }
  const header = `${totalEvents} 个事件。类型分布:${Object.entries(typeCounts).map(([t, n]) => `${t}=${n}`).join(', ')}`;
  return { header, body: lines.join('\n') };
}

// Build the daily-journal prompt.
function buildPrompt(dateStr, summary, recentJournals) {
  const previousNotes = recentJournals.length > 0
    ? `\n\n最近的 daily:\n${recentJournals.slice(0, 3).map(j => `- ${j.date}: ${j.title}`).join('\n')}`
    : '';
  return {
    system: `你是 Second Brain 的 daily-journal 智能体。你的工作是把今天的事件流整理成一篇中文日记,
简洁、有结构、对用户有用。不要复述所有事件,要从事件里提取模式、看到完成的东西、注意到被忽略的东西。`,
    prompt: `日期: ${dateStr}

事件流:
${summary.header}
${summary.body}
${previousNotes}

请生成一篇日记,包含:
1. **今日焦点** — 1-2 句:今天最重要的事
2. **完成的事** — 列出真正做完的 (不是开了个新 task)
3. **进展中的事** — 还在进行中的
4. **被忽略的信号** — 反复出现但没完成的事件类型(可能是瓶颈)
5. **明天看什么** — 1-2 句建议

格式: 中文 markdown,不要 emoji 装饰,简洁。`,
    maxTokens: 1200,
    temperature: 0.7,
  };
}

// Local-echo implementation (deterministic fallback).
function localEchoDaily(dateStr, summary) {
  const events = summary.body.split('\n').filter(l => l.startsWith('- '));
  const completed = events.filter(l => /task\.done|project\.done|link\.imported/.test(l));
  const created = events.filter(l => /\.created$/.test(l));
  const updated = events.filter(l => /\.updated$/.test(l));
  const deleted = events.filter(l => /\.deleted$/.test(l));
  const fileChanges = events.filter(l => /file\.changed/.test(l)).map(l => {
    // Extract the path from the line
    const m = l.match(/path=([^ ]+)/);
    return m ? '- ' + m[1] : l;
  });

  const sections = [
    `## 今日焦点`,
    summary.header,
    '',
    `## 文件变化 (Obsidian 直接编辑)
${fileChanges.length === 0 ? '_今天没有外部文件修改_`' : fileChanges.slice(0, 8).join('\n') + (fileChanges.length > 8 ? `\n(+ ${fileChanges.length - 8} 更多)` : '')}

## 完成的事`,
    completed.length > 0 ? completed.join('\n') : '_暂无_',
    '',
    `## 进展中的事`,
    created.length > 0 ? created.join('\n') : '_暂无_',
    '',
    `## 被忽略的信号`,
    updated.length > 3
      ? `今天更新了 ${updated.length} 个 entry,其中可能有些没真正完成。`
      : '_今天没有大量未完成的更新_',
    '',
    `## 明天看什么`,
    deleted.length > 0
      ? `今天删了 ${deleted.length} 个 entry — 看看是不是有些其实可以恢复。`
      : `基于今天的活动,看看上面完成 + 进展中的事里哪些值得推进。`,
  ];
  return `# ${dateStr} 日记\n\n${sections.join('\n')}\n`;
}

// Generate a daily journal markdown string. Uses LLM when available,
// local-echo otherwise.
export async function generateDaily({ date, eventsByDay, recentJournals = [], provider = null, llm = null }) {
  const dateStr = date || formatDate(new Date());
  const summary = summariseEvents(eventsByDay);
  const usedProvider = provider || pickProvider(llm || undefined);
  let text;
  if (usedProvider.info().name === 'local-echo') {
    text = localEchoDaily(dateStr, summary);
  } else {
    const prompt = buildPrompt(dateStr, summary, recentJournals);
    const result = await usedProvider.complete(prompt);
    text = result.text;
  }
  // Always include frontmatter
  const fm = [
    '---',
    `date: ${dateStr}`,
    'type: daily-journal',
    `eventsCount: ${summary.body.split('\n').filter(l => l.startsWith('- ')).length}`,
    `provider: ${usedProvider.info().name}`,
    `model: ${usedProvider.info().model}`,
    '---',
    '',
  ].join('\n');
  return { content: fm + text, provider: usedProvider.info() };
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Read recent journals from 00-Daily/.
export async function readRecentJournals(vaultRoot, n = 5) {
  const dir = path.join(vaultRoot, DAILY_DIRNAME);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const journals = [];
  for (const name of entries.sort().reverse()) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue;
    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf8');
      const m = raw.match(/^# (\d{4}-\d{2}-\d{2})/m);
      if (m) journals.push({ date: m[1], title: m[1], path: path.join(dir, name) });
    } catch {}
    if (journals.length >= n) break;
  }
  return journals;
}

// Write a daily journal to vaultRoot/00-Daily/YYYY-MM-DD.md.
export async function writeDaily(vaultRoot, dateStr, content) {
  const dir = path.join(vaultRoot, DAILY_DIRNAME);
  await fs.mkdir(dir, { recursive: true });
  // Atomic write
  const target = path.join(dir, `${dateStr}.md`);
  const tmp = target + '.tmp-' + process.pid + '-' + Date.now();
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, target);
  return target;
}
