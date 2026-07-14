// File system watcher (v0.5+).
//
// Watches the vault for markdown file changes and emits file.changed events
// via the EventStore. Uses fs.watch + manual recursive directory traversal
// since fs.watch({recursive:true}) only works on macOS/Windows.
//
// Privacy: only emits paths inside vaultRoot. No content leaves the machine.

import { watch, promises as fs } from 'node:fs';
import path from 'node:path';

const DEBOUNCE_MS = 250;
const IGNORED_DIRS = new Set([
  '.obsidian', '.trash', '.git', 'node_modules', '.events',
]);
const WATCHED_EXTENSIONS = new Set(['.md', '.markdown']);

export class FsWatcher {
  constructor(vaultRoot, events) {
    this.vaultRoot = vaultRoot;
    this.events = events;
    this.watchers = []; // fs.FSWatcher handles
    this.timers = new Map();
    this.started = false;
    this.stopped = false;
  }

  async start() {
    if (this.started || this.stopped) return;
    this.started = true;
    // Try recursive watch first (works on macOS/Windows)
    let recursiveOk = false;
    try {
      const w = watch(this.vaultRoot, { recursive: true }, (event, filename) => {
        if (!filename) return;
        this._onChange(path.join(this.vaultRoot, filename), event);
      });
      w.on('error', (err) => {
        console.warn('[fs-watcher] recursive watch error, falling back to non-recursive:', err.message);
        try { w.close(); } catch {}
        this.watchers = this.watchers.filter(x => x !== w);
        this._watchSubtree();
      });
      this.watchers.push(w);
      recursiveOk = true;
    } catch (err) {
      console.warn('[fs-watcher] recursive watch unsupported, using per-dir watch:', err.message);
    }
    if (!recursiveOk) {
      this._watchSubtree();
    }
  }

  _watchSubtree() {
    // Watch root + every immediate subdir (non-recursive).
    // This catches files changed in the root or top-level dirs, which is
    // where the user's vault structure lives (10-People/, 20-Tasks/, etc.)
    this._watchOne(this.vaultRoot);
    // Walk one level synchronously to set up watchers for each subdir
    try {
      const { readdirSync } = require_node_fs_sync();
      const entries = readdirSync(this.vaultRoot, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !IGNORED_DIRS.has(e.name)) {
          this._watchOne(path.join(this.vaultRoot, e.name));
        }
      }
    } catch (err) {
      // If sync read fails (rare), fall back to async
      this._asyncSetupSubtree();
    }
  }

  async _asyncSetupSubtree() {
    try {
      const entries = await fs.readdir(this.vaultRoot, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !IGNORED_DIRS.has(e.name)) {
          this._watchOne(path.join(this.vaultRoot, e.name));
        }
      }
    } catch (err) {
      console.warn('[fs-watcher] subtree setup failed:', err.message);
    }
  }

  _watchOne(dir) {
    try {
      const w = watch(dir, (event, filename) => {
        if (!filename) return;
        this._onChange(path.join(dir, filename), event);
      });
      w.on('error', (err) => {
        // dir might have been deleted; just close quietly
        try { w.close(); } catch {}
      });
      this.watchers.push(w);
    } catch (err) {
      // dir might not exist; ignore
    }
  }

  _onChange(fullPath, event) {
    // Filter: must be inside vaultRoot, not in ignored dirs
    if (!fullPath.startsWith(this.vaultRoot)) return;
    const rel = path.relative(this.vaultRoot, fullPath);
    if (rel.startsWith('..')) return;
    const parts = rel.split(path.sep);
    if (parts.some(p => IGNORED_DIRS.has(p))) return;
    const ext = path.extname(fullPath);
    if (!WATCHED_EXTENSIONS.has(ext)) return;
    // Debounce per-path (rapid save = multiple events)
    if (this.timers.has(fullPath)) clearTimeout(this.timers.get(fullPath));
    this.timers.set(fullPath, setTimeout(() => {
      this.timers.delete(fullPath);
      this._emit(fullPath, event);
    }, DEBOUNCE_MS));
  }

  _emit(fullPath, event) {
    const rel = path.relative(this.vaultRoot, fullPath);
    const name = path.basename(fullPath);
    const ext = path.extname(fullPath);
    // Guess the type from the directory name (matches vault config convention)
    const dirName = path.basename(path.dirname(fullPath));
    const typeByDir = { '10-People': 'person', '20-Tasks': 'task', '30-Projects': 'project', '40-Links': 'link' };
    const entityType = typeByDir[dirName] || null;
    this.events.append('file.changed', {
      path: rel,
      name,
      ext,
      fsEvent: event,
      entityType,
    }).catch(err => console.warn('[fs-watcher] emit failed:', err.message));
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    for (const w of this.watchers) {
      try { w.close(); } catch {}
    }
    this.watchers = [];
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.started = false;
  }
}

// Helper: synchronous fs import that works in both ESM and CJS contexts.
function require_node_fs_sync() {
  // We're in ESM (the .mjs file). Use createRequire to get sync fs.
  const { createRequire } = require('node:module');
  const r = createRequire(import.meta.url);
  return r('node:fs');
}
