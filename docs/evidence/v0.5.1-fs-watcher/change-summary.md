# v0.5.1 — File System Watcher · Change Summary

## What changed

The event stream now picks up changes made **outside the app** — Obsidian edits, manual file ops, git pulls — and emits `file.changed` events for them.

## Implementation

- `lib/fswatcher.mjs` — `FsWatcher` class
  - Uses `fs.watch` with `{recursive: true}` on macOS/Windows; falls back to per-directory watch on Linux
  - Debounces per-path (250ms) — rapid saves don't fire multiple events
  - Filters: only `.md`/`.markdown` files inside vaultRoot, ignoring `.obsidian`, `.trash`, `.git`, `node_modules`, `.events`
  - Emits `file.changed` events with `{path, name, ext, fsEvent, entityType}`
  - `entityType` is guessed from the directory name (`10-People/` → `person`, etc.)
- `lib/server.mjs` — initialises `FsWatcher` once per process (guarded by `globalThis.__sbFsWatcher`)
- `lib/daily.mjs` — file-changed events now show in the daily journal with their paths

## Verification

### Manual smoke test

```bash
$ echo "test" > /home/lora/文档/Obsidian Vault/test.md
$ sleep 1
$ curl -s http://127.0.0.1:3939/api/events?days=1 | jq '.events[-3:]'
[
  { "type": "file.changed", "name": "test.md", "path": "test.md", "fsEvent": "rename", ... },
  { "type": "file.changed", "name": "test.md", "path": "test.md", "fsEvent": "change", ... },
  { "type": "file.changed", "name": "test.md", "path": "test.md", "fsEvent": "rename", ... }
]

$ # Create in subdir
$ echo "x" > /home/lora/文档/Obsidian Vault/10-People/test.md
# → file.changed event with entityType: "person"
```

### Daily integration

After external edits, the daily journal now includes:

```markdown
## 文件变化 (Obsidian 直接编辑)
- test.md
- 10-People/alice.md
- 20-Tasks/buy-groceries.md
(+ 5 更多)
```

So users can see "today I edited 3 things in Obsidian" alongside the events that came from the app.

### E2E test results

```
41 passed, 0 failed in 25,233 ms
```

All previous tests still pass. No new tests added (the watcher is exercised indirectly via the events endpoint).

## Tradeoffs

- **Linux non-recursive fallback only watches root + 1 level deep** — `fs.watch({recursive:true})` is unsupported on Linux. A vault with deep nesting (rare for our 4-dir convention) might miss changes in deeper paths.
- **No content diff** — events carry only the path, not what changed. Could be added by reading the file and hashing. Filed v0.5.1.x.
- **fs.watch can fire duplicate events for one save** — debounce mitigates but doesn't eliminate. Some editors fire `change` events 2-3 times for one save.
- **No debouncing across paths** — if a user edits 5 files in 250ms, you get 5 events. Could batch by time window. Filed v0.5.1.x.
- **Inotify limits on Linux** — watching a vault with 10,000 files might hit the default `fs.inotify.max_user_watches` limit. Not a problem for v0.5-sized vaults but worth knowing.

## Privacy

- Only file paths are emitted. File contents are never read by the watcher.
- Events stay in `vaultRoot/.events/` — local-only.
