// Event store (v0.5+) — append-only JSONL log.
//
// One file per day under vaultRoot/.events/YYYY-MM-DD.jsonl.
// Each line is one event: {ts, type, [payload]}.
//
// Threading model: append is atomic on POSIX (write < PIPE_BUF). The file
// is locked at the OS level for the duration of the write call. Reads
// stream the file line-by-line.
//
// Why JSONL: human-readable, line-oriented, append-friendly, no schema
// migration needed. The first line could be a schema-version marker.
//
// Privacy: events stay inside the vault. No external API calls.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const EVENTS_DIRNAME = '.events';

export class EventStore {
  constructor(vaultRoot) {
    this.vaultRoot = vaultRoot;
    this.dir = path.join(vaultRoot, EVENTS_DIRNAME);
    this._writeQueue = Promise.resolve(); // serialise writes
  }

  async init() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  _fileForDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return path.join(this.dir, `${y}-${m}-${d}.jsonl`);
  }

  // Append one event. Returns the event with id + ts.
  async append(type, payload = {}) {
    await this.init();
    const event = {
      id: randomUUID(),
      ts: new Date().toISOString(),
      type,
      ...payload,
    };
    const line = JSON.stringify(event) + '\n';
    const file = this._fileForDate();
    // Queue writes so concurrent calls don't interleave bytes.
    this._writeQueue = this._writeQueue.then(async () => {
      // Atomic append: open with 'a' (POSIX append mode) is atomic for
      // writes smaller than PIPE_BUF (4 KiB on Linux). Our lines are
      // typically well under 1 KiB.
      const handle = await fs.open(file, 'a');
      try {
        await handle.write(line);
      } finally {
        await handle.close();
      }
    });
    await this._writeQueue;
    return event;
  }

  // Read events for a date range. Yields {date, events[]}.
  async readRange(fromDate, toDate) {
    await this.init();
    const out = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    // Walk day-by-day
    const dayMs = 86400000;
    const today = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let cur = today;
    while (cur.getTime() <= endDay.getTime()) {
      const file = this._fileForDate(cur);
      try {
        const data = await fs.readFile(file, 'utf8');
        const lines = data.split('\n').filter(l => l.length > 0);
        const events = [];
        for (const line of lines) {
          try {
            events.push(JSON.parse(line));
          } catch {
            // skip malformed lines (don't crash the whole read)
          }
        }
        if (events.length > 0) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          out.push({ date: `${y}-${m}-${d}`, events });
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      cur = new Date(cur.getTime() + dayMs);
    }
    return out;
  }

  // Read events for today.
  async readToday() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const days = await this.readRange(today, today);
    return days.length > 0 ? days[0].events : [];
  }

  // Read events for the last N days (including today).
  async readLastNDays(n = 7) {
    const today = new Date();
    const dayMs = 86400000;
    const from = new Date(today.getTime() - (n - 1) * dayMs);
    return this.readRange(from, today);
  }
}
