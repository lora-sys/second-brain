// Agent (v0.30+) — Real LLM integration for the cockpit 智能体.
//
// The browser previously ran `agentComplete()` in-browser — a deterministic
// local-echo. v0.30 replaces that path for users who have configured an
// API key in ADR-0008, while keeping the in-browser fallback for everyone
// else (and for transient network errors).
//
// Privacy: only the user's typed prompt + a compact vault summary is
// shipped to the configured provider. No bulk export.
//
// API surface:
//   runAgent({ prompt, vaultPath, llm, maxTokens?, temperature?, now? })
//     -> { text, provider, durationMs, error?, skillsLoaded }

import { listSkills, matchSkills, readSkill } from './skills.mjs';
import { LocalEchoProvider, CachedProvider } from './llm/index.mjs';
import { createOpenAIProvider } from './llm/openai.mjs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Build a compact system prompt from the current vault state.
//
// Designed to be small (~300 tokens max) and privacy-respectful: counts only
// + 5 most-recent entity titles. The provider sees the user prompt on top
// of this summary.
async function buildSystemPrompt(vaultRoot, matchedSkills) {
  // Counts (cheap).
  const entities = { person: 0, task: 0, project: 0, link: 0, decision: 0 };
  const recent = []; // {type, slug, title, updated}
  const dayMs = 86400000;
  const horizon = Date.now() - 30 * dayMs;

  for (const type of Object.keys(entities)) {
    let items = [];
    try {
      const dir = path.join(vaultRoot, type === 'person' ? '10-People'
        : type === 'task' ? '20-Tasks'
        : type === 'project' ? '30-Projects'
        : type === 'link' ? '40-Links'
        : type === 'decision' ? '50-Decisions' : null);
      if (!dir) continue;
      const entries = await fs.readdir(path.join(vaultRoot, dir)).catch(() => []);
      for (const name of entries) {
        if (!name.endsWith('.md')) continue;
        const slug = name.replace(/\.md$/, '');
        // Best-effort: parse title from frontmatter; fall back to slug.
        let title = slug;
        try {
          const raw = await fs.readFile(path.join(vaultRoot, dir, name), 'utf8');
          const m = raw.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
          if (m) title = m[1];
        } catch {}
        items.push({ slug, title });
        // Track recency via file mtime (cheap).
        try {
          const st = await fs.stat(path.join(vaultRoot, dir, name));
          if (st.mtimeMs >= horizon) {
            recent.push({ type, slug, title, updated: st.mtime.toISOString() });
          }
        } catch {}
      }
    } catch {}
    entities[type] = items.length;
  }

  recent.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const topRecent = recent.slice(0, 5);

  const countsLine =
    `用户 vault 概况: ${entities.person} 人物 / ${entities.task} 任务 / ` +
    `${entities.project} 项目 / ${entities.link} 链接 / ${entities.decision} 决策。`;

  const recentLine = topRecent.length
    ? `\n最近更新的 5 条:\n` + topRecent.map(r => `- [${r.type}] ${r.title} (${(r.updated || '').slice(0, 10)})`).join('\n')
    : '';

  const skillLine = matchedSkills.length
    ? `\n可用的 skills (${matchedSkills.length}):\n` + matchedSkills.map(s =>
        `- ${s.name}: ${s.description}`).join('\n')
      + `\n(只在用户问题明显匹配时参考 skill 的内容)`
    : '';

  return (
    `你是 Second Brain 的本地智能体。今天日期 ${new Date().toISOString().slice(0, 10)}。` +
    `\n回答简洁、用中文,必要时引用上面的 vault 内容。` +
    `\n不要捏造不存在的条目 — 引用 vault 数据时如实说明。` +
    `\n${countsLine}${recentLine}${skillLine}`
  );
}

export function pickProvider(opts = {}) {
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY || '';
  const baseURL = opts.baseURL || opts.baseUrl || process.env.OPENAI_BASE_URL || '';
  const model = opts.model || process.env.OPENAI_MODEL || '';
  if (apiKey || baseURL) {
    try {
      const provider = createOpenAIProvider({ apiKey, baseURL, model });
      return new CachedProvider(provider, { ttlMs: 30_000 });
    } catch (err) {
      console.warn('[agent] failed to create OpenAI provider, falling back to local-echo:', err.message);
    }
  }
  return new LocalEchoProvider();
}

export async function runAgent({
  prompt,
  vaultPath,
  llm = {},
  maxTokens = 500,
  temperature = 0.4,
  now = null,
} = {}) {
  const t0 = Date.now();
  const text = String(prompt || '').trim();
  if (!text) {
    return { text: '', provider: { name: 'local-echo', model: 'no-input', isLocal: true }, durationMs: 0, skillsLoaded: 0 };
  }
  // Find matching skills, if any.
  let matchedSkills = [];
  try {
    const all = await listSkills(vaultPath);
    matchedSkills = matchSkills(all, text).slice(0, 5);
  } catch (e) { /* no skills dir — fine */ }

  // If user has question like "skills: <slug>", include that body verbatim
  // in the system prompt.
  let extraContext = '';
  const directSkillMatch = text.match(/^skill\s*[:：]\s*([\w-]+)/i);
  if (directSkillMatch && vaultPath) {
    try {
      const fullSkill = await readSkill(vaultPath, directSkillMatch[1]);
      if (fullSkill) extraContext = `\n\n用户明确请求的 skill body:\n${fullSkill.body || ''}`;
    } catch {}
  }

  const systemPrompt = await buildSystemPrompt(vaultPath, matchedSkills) + extraContext;
  const provider = pickProvider(llm);

  try {
    const result = await provider.complete({
      system: systemPrompt,
      prompt: text,
      maxTokens,
      temperature,
    });
    return {
      text: (result && (result.content || result.text)) || '',
      provider: provider.info(),
      durationMs: Date.now() - t0,
      skillsLoaded: matchedSkills.length,
    };
  } catch (err) {
    return {
      text: '',
      provider: provider.info(),
      durationMs: Date.now() - t0,
      error: err.message || String(err),
      skillsLoaded: matchedSkills.length,
    };
  }
}
