// YAML frontmatter parser and serializer.
// Format:
//   ---
//   key: value
//   list:
//     - item1
//     - item2
//   ---
//   Markdown body...

import yaml from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parse(text) {
  if (!text || typeof text !== 'string') {
    return { data: {}, body: '' };
  }
  const m = text.match(FRONTMATTER_RE);
  if (!m) return { data: {}, body: text };
  let data = parseYamlLenient(m[1]);
  // If the frontmatter block contained body-like content (markdown that the user
  // accidentally typed at column 0), it isn't valid YAML. parseYamlLenient above
  // already returns what it could salvage. Treat anything beyond what YAML accepted
  // as part of the body.
  const acceptedLen = data._acceptedLen ?? m[1].length;
  delete data._acceptedLen;
  const leftover = m[1].slice(acceptedLen).trim();
  const body = (leftover ? leftover + '\n' : '') + (m[2] ?? '');
  return { data, body };
}

// Lenient YAML parser: tries to parse the whole block; if it fails, drops the
// trailing line that broke it and retries, until success or empty.
function parseYamlLenient(block) {
  let cursor = block.length;
  for (let i = 0; i < 20; i += 1) {
    const slice = block.slice(0, cursor);
    try {
      const parsed = yaml.load(slice);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsed._acceptedLen = slice.length;
        return parsed;
      }
      if (parsed === undefined || parsed === null) {
        return {};
      }
      return {};
    } catch (err) {
      // Find the last newline before the cursor and chop there.
      const lastNl = block.lastIndexOf('\n', cursor - 1);
      if (lastNl <= 0) return {};
      cursor = lastNl;
    }
  }
  return {};
}

export function stringify(data, body) {
  const safeBody = body ?? '';
  const obj = data && typeof data === 'object' ? data : {};
  // Drop empty values for cleaner files.
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    clean[k] = v;
  }
  const yamlText = yaml.dump(clean, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });
  return `---\n${yamlText}---\n\n${safeBody}`;
}

// Generate a filesystem-safe slug from a title.
export function slugify(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/[^\p{L}\p{N}\-_]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function nowIso() {
  return new Date().toISOString();
}
