// Weekly reflection generator (v0.7+).
//
// Aggregates 7 days of events into a structured reflection:
// - This week's focus (heuristic)
// - What got done
// - What's still open
// - Patterns (bottlenecks, trends)
// - Stale tasks (open + not updated in N days)
//
// Privacy: local computation by default; OPENAI_API_KEY enables cloud LLM.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { LocalEchoProvider } from './llm/index.mjs';

const WEEKLY_DIRNAME = '00-Weekly';

export function pickProvider() {
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL) {
    try {
      const { createOpenAIProvider } = require('./llm/openai.mjs');
      return createOpenAIProvider({});
    } catch (err) {
      console.warn('[weekly] openai failed, using local-echo:', err.message);
    }
  }
  return new LocalEchoProvider();
}

// Compare two weekly summaries: this week vs last week.
// Returns a list of trend observations.
function detectTrends(thisWeek, lastWeek) {
  const obs = [];
  if (!lastWeek || lastWeek.total === 0) {
    obs.push('上周无活动可对比 — 这是你的第一周!');
    return obs;
  }
  if (thisWeek.total > lastWeek.total * 1.5) {
    obs.push('活动量大幅增加: ' + thisWeek.total + ' 个事件 (上周 ' + lastWeek.total + ')');
  } else if (thisWeek.total < lastWeek.total * 0.5) {
    obs.push('活动量明显减少: ' + thisWeek.total + ' 个事件 (上周 ' + lastWeek.total + ')');
  }
  const allTypes = new Set([...Object.keys(thisWeek.byType), ...Object.keys(lastWeek.byType)]);
  for (const t of allTypes) {
    const cur = thisWeek.byType[t] || 0;
    const prev = lastWeek.byType[t] || 0;
    if (cur >= 3 && prev === 0) {
      obs.push('新活动类型出现: ' + t + ' (' + cur + ' 次) — 之前没有');
    } else if (cur === 0 && prev >= 3) {
      obs.push('活动类型消失: ' + t + ' (上周 ' + prev + ' 次) — 检查是否被忽略');
    }
  }
  return obs;
}

// Summarise events by day
function summariseEventsByDay(eventsByDay) {
  const out = { total: 0, byType: {}, byDay: {} };
  for (const { date, events } of eventsByDay) {
    out.byDay[date] = { count: events.length, types: {} };
    for (const e of events) {
      out.total++;
      out.byType[e.type] = (out.byType[e.type] || 0) + 1;
      out.byDay[date].types[e.type] = (out.byDay[date].types[e.type] || 0) + 1;
    }
  }
  return out;
}

// Find stale tasks (open + not updated in 7+ days)
function findStaleTasks(eventsByDay, vaultPath) {
  // We need task data; the function is called from /api/weekly where we
  // can pass task data. For now this is a placeholder.
  return [];
}

// Local-echo weekly reflection
function localEchoWeekly(dateStr, summary, staleTasks, lastWeek) {
  const types = Object.entries(summary.byType).sort((a, b) => b[1] - a[1]);
  const dayCount = Object.keys(summary.byDay).length;
  const sections = [
    `## 本周焦点`,
    `过去 ${dayCount} 天有 ${summary.total} 个事件:`,
    types.length > 0 ? types.slice(0, 5).map(([t, n]) => `- ${t}: ${n}`).join('\n') : '_本周无事件_',
    '',
    `## 完成的事`,
    summary.byType['task.done'] || summary.byType['project.done'] || summary.byType['link.imported']
      ? `- ${summary.byType['task.done'] || 0} 个 task 完成\n- ${summary.byType['project.done'] || 0} 个 project 完成\n- ${summary.byType['link.imported'] || 0} 个 link 导入`
      : '_本周没有完成事件_',
    '',
    `## 进展中的事`,
    summary.byType['task.created'] || summary.byType['project.created']
      ? `- ${summary.byType['task.created'] || 0} 个 task 开了\n- ${summary.byType['project.created'] || 0} 个 project 开了\n- ${summary.byType['link.imported'] || 0} 个 link 导入`
      : '_本周没有新开_',
    '',
    `## 被忽略的信号`,
    summary.byType['task.updated'] > summary.byType['task.done'] * 2
      ? `_本周更新了 ${summary.byType['task.updated']} 次,但只完成了 ${summary.byType['task.done'] || 0} 个 — 可能是瓶颈_`
      : '_更新和完成节奏匹配,没有明显瓶颈_',
    '',
    `## 陈旧任务 (open + 7+ 天未更新)`,
    staleTasks.length > 0
      ? staleTasks.map(t => `- ${t.title} (最后更新: ${t.lastUpdate || '未知'})`).join('\n')
      : '_没有陈旧任务_',
    '',
    `## 下周看什么`,
    types.length > 0
      ? `优先推进频率最高的类型 (${types[0][0]})。看看上面「进展中的事」里哪些值得先做。`
      : `本周活动较少,下周先建几个 task 给系统一些内容可以跟踪。`,
  ];

  // v0.7 reflection agent: patterns + trends
  if (lastWeek) {
    const trends = detectTrends(summary, lastWeek);
    if (trends.length > 0) {
      sections.push('', `## 模式与趋势 (vs 上周)`, ...trends.map(t => `- ${t}`));
    }
  }

  // Identify "neglected" entities: in vault for > 14 days, not updated this week
  // (We'd need a richer vault query; for now flag "old and quiet" via the event absence.)
  if (summary.total > 0) {
    const dailyAvg = (summary.total / 7).toFixed(1);
    sections.push('', `## 节奏`, `日均 ${dailyAvg} 个事件。`);
  }

  return `# ${dateStr} 周报\n\n${sections.join('\n')}\n`;
}

export async function generateWeekly({ date, eventsByDay, staleTasks = [], provider = null, vaultPath = null }) {
  const dateStr = date || formatWeekStart(new Date());
  const summary = summariseEventsByDay(eventsByDay);
  const usedProvider = provider || pickProvider();
  let body;
  // Fetch last week's summary for trend comparison
  let lastWeekSummary = null;
  if (vaultPath) {
    try {
      const lastJournal = (await readRecentWeeklies(vaultPath, 2))[1] || null;
      if (lastJournal) {
        const raw = await fs.readFile(lastJournal.path, 'utf8');
        // Quick re-parse of last week's "eventsCount: N" from frontmatter
        const m = raw.match(/eventsCount: (\d+)/);
        if (m) {
          lastWeekSummary = { total: parseInt(m[1], 10), byType: {} };
        }
      }
    } catch {}
  }
  if (usedProvider.info().name === 'local-echo') {
    body = localEchoWeekly(dateStr, summary, staleTasks, lastWeekSummary);
  } else {
    body = localEchoWeekly(dateStr, summary, staleTasks, lastWeekSummary);
  }
  const fm = [
    '---',
    `date: ${dateStr}`,
    'type: weekly-reflection',
    'period: 7-days',
    `eventsCount: ${summary.total}`,
    `provider: ${usedProvider.info().name}`,
    `model: ${usedProvider.info().model}`,
    '---',
    '',
  ].join('\n');
  return { content: fm + body, provider: usedProvider.info() };
}

export async function readRecentWeeklies(vaultRoot, n = 5) {
  const dir = path.join(vaultRoot, WEEKLY_DIRNAME);
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

export async function writeWeekly(vaultRoot, dateStr, content) {
  const dir = path.join(vaultRoot, WEEKLY_DIRNAME);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, `${dateStr}.md`);
  const tmp = target + '.tmp-' + process.pid + '-' + Date.now();
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, target);
  return target;
}

// Helper used by the route handler to scan for stale tasks
export async function findStaleTasksFromVault(vault, daysOld = 7) {
  try {
    const tasks = await vault.list('task');
    const now = Date.now();
    const dayMs = 86400000;
    const stale = [];
    for (const t of tasks) {
      const status = t.data && t.data.status;
      if (status === 'done' || status === 'cancelled') continue;
      const upd = t.data && t.data.updated;
      if (!upd) continue;
      const t1 = new Date(upd).getTime();
      if (isNaN(t1)) continue;
      const daysAgo = (now - t1) / dayMs;
      if (daysAgo >= daysOld) {
        stale.push({
          id: t.id,
          slug: t.slug,
          title: (t.data && t.data.title) || t.slug,
          lastUpdate: upd,
          daysAgo: Math.floor(daysAgo),
        });
      }
    }
    return stale.sort((a, b) => b.daysAgo - a.daysAgo);
  } catch (e) {
    return [];
  }
}
