// Skills (v0.9+) — Personal Agent's reusable instruction set.
//
// Skills are stored in the vault under `00-AI/skills/{slug}.md`.
// Each skill is a markdown file with frontmatter (name, description, tags)
// and a body (instructions + examples).
//
// The agent can:
// - list available skills
// - load a skill by slug (its body becomes part of the prompt)
// - save the current response as a new skill

import { promises as fs } from 'node:fs';
import path from 'node:path';

const SKILLS_DIR = path.join('00-AI', 'skills');

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: raw };
  const fmBlock = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, '');
  const meta = {};
  for (const line of fmBlock.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { meta, body };
}

export async function listSkills(vaultRoot) {
  const dir = path.join(vaultRoot, SKILLS_DIR);
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const skills = [];
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf8');
      const { meta } = parseFrontmatter(raw);
      skills.push({
        slug: name.replace(/\.md$/, ''),
        name: meta.name || name,
        description: meta.description || '',
        tags: (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        path: path.join(dir, name),
      });
    } catch {}
  }
  return skills;
}

export async function readSkill(vaultRoot, slug) {
  const file = path.join(vaultRoot, SKILLS_DIR, `${slug}.md`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    return { slug, ...meta, body };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeSkill(vaultRoot, { slug, name, description, tags, body }) {
  const dir = path.join(vaultRoot, SKILLS_DIR);
  await fs.mkdir(dir, { recursive: true });
  const fm = [
    '---',
    `name: ${name || slug}`,
    `description: ${description || ''}`,
    `tags: ${(tags || []).join(', ')}`,
    `createdAt: ${new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');
  const content = fm + (body || '');
  const target = path.join(dir, `${slug}.md`);
  const tmp = target + '.tmp-' + process.pid + '-' + Date.now();
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, target);
  return target;
}

// Find skills matching a prompt by simple keyword overlap
export function matchSkills(skills, prompt, limit = 3) {
  if (!prompt || skills.length === 0) return [];
  const tokens = prompt.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  const scored = skills.map(s => {
    let score = 0;
    const haystack = (s.name + ' ' + s.description + ' ' + (s.tags || []).join(' ')).toLowerCase();
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 1;
      if (s.tags && s.tags.some(t => t.toLowerCase() === tok)) score += 2;
    }
    return { skill: s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, limit).map(s => s.skill);
}
