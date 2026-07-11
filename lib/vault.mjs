// Vault operations: list, read, write, delete entities.
// Each entity is a single .md file in a typed directory.
// Frontmatter carries structured fields; body carries markdown notes.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse, stringify, slugify, nowIso } from './frontmatter.mjs';

const TYPES = ['person', 'task', 'project', 'link'];

export class Vault {
  constructor({ root, directories }) {
    this.root = root;
    this.directories = directories;
    this.typeByDir = Object.fromEntries(
      Object.entries(directories).map(([type, dir]) => [dir, type])
    );
  }

  dirFor(type) {
    const d = this.directories[type];
    if (!d) throw new Error(`Unknown type: ${type}`);
    return path.join(this.root, d);
  }

  typeForDir(dirName) {
    return this.typeForDir[dirName] || null;
  }

  // Resolve an entity id ("type/slug") into an absolute path.
  pathFor(type, slug) {
    return path.join(this.dirFor(type), `${slug}.md`);
  }

  // Inverse: extract type+slug from a relative path under root.
  parseId(relPath) {
    const norm = relPath.replace(/\\/g, '/').replace(/\.md$/, '');
    const parts = norm.split('/');
    if (parts.length < 2) return null;
    const slug = parts[parts.length - 1];
    const dir = parts[parts.length - 2];
    const type = this.typeByDir[dir];
    if (!type) return null;
    return { type, slug, id: `${dir}/${slug}` };
  }

  async ensureDirs() {
    for (const t of TYPES) {
      const d = this.dirFor(t);
      await fs.mkdir(d, { recursive: true });
    }
  }

  async list(type) {
    await this.ensureDirs();
    const dir = this.dirFor(type);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.md')) continue;
      const slug = e.name.replace(/\.md$/, '');
      try {
        const entity = await this.read(type, slug);
        results.push(entity);
      } catch (err) {
        console.warn(`[vault] failed to read ${type}/${slug}:`, err.message);
      }
    }
    // Sort by updated desc.
    results.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    return results;
  }

  async listAll() {
    const out = [];
    for (const t of TYPES) {
      const items = await this.list(t);
      out.push(...items);
    }
    out.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    return out;
  }

  async read(type, slug) {
    const filePath = this.pathFor(type, slug);
    const text = await fs.readFile(filePath, 'utf8');
    const { data, body } = parse(text);
    return {
      id: `${this.directories[type]}/${slug}`,
      type,
      slug,
      path: filePath,
      data,
      body,
    };
  }

  async write(type, slug, { data, body }) {
    if (!slug) throw new Error('slug is required');
    const dir = this.dirFor(type);
    await fs.mkdir(dir, { recursive: true });
    const stamp = nowIso();
    const merged = {
      type,
      updated: stamp,
      ...data,
      created: data?.created || stamp,
    };
    const filePath = this.pathFor(type, slug);
    const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    const text = stringify(merged, body ?? '');
    await fs.writeFile(tmp, text, 'utf8');
    await fs.rename(tmp, filePath);
    return {
      id: `${this.directories[type]}/${slug}`,
      type,
      slug,
      path: filePath,
      data: merged,
      body: body ?? '',
    };
  }

  async delete(type, slug) {
    const filePath = this.pathFor(type, slug);
    await fs.unlink(filePath);
    return { ok: true };
  }

  // Find existing slug, or generate one from a title.
  async uniqueSlug(type, title, hint) {
    const base = slugify(hint || title || 'untitled');
    let candidate = base || 'untitled';
    let i = 1;
    while (true) {
      try {
        await fs.access(this.pathFor(type, candidate));
        i += 1;
        candidate = `${base}-${i}`;
      } catch {
        return candidate;
      }
    }
  }

  // Extract wikilink references from a body: [[Type/slug]] or [[slug]]
  extractWikilinks(body) {
    if (!body) return [];
    const re = /\[\[([^\]]+)\]\]/g;
    const out = [];
    let m;
    while ((m = re.exec(body)) !== null) {
      out.push(m[1].trim());
    }
    return out;
  }

  // Convert [[target]] to internal links. If bare slug, treat as title search.
  async resolveWikilink(target) {
    // Accept "type/slug", "slug", or "title"
    if (target.includes('/')) {
      const parts = target.split('/');
      const type = this.typeByDir[parts[0]];
      const slug = parts[parts.length - 1];
      if (type && slug) {
        try {
          return await this.read(type, slug);
        } catch {
          return null;
        }
      }
    }
    // Try as slug across all types
    for (const t of TYPES) {
      try {
        return await this.read(t, target);
      } catch {}
    }
    // Fallback: title match
    const all = await this.listAll();
    const lower = target.toLowerCase();
    return (
      all.find((e) => (e.data?.title || e.data?.name || '').toLowerCase() === lower) ||
      null
    );
  }
}

export { TYPES };
