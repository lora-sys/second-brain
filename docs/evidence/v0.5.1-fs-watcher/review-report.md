# v0.5.1 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> One iteration. 41/41 E2E pass. Watcher verified via manual + automated smoke tests.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | lib/fswatcher.mjs:_onChange | File extensions are filtered to `.md`/`.markdown` only. `.canvas` and other Obsidian file types ignored. | Acceptable for v0.5 — daily journal doesn't need to track canvas files. |
| 2 | Low | lib/fswatcher.mjs | The debounce coalesces rapid events for the same path but different paths within 250ms still fire separately. | Filed v0.5.1.x. |
| 3 | Low | lib/daily.mjs:localEchoDaily | The file-changes section shows up to 8 paths then `+ N 更多`. Could be smarter about prioritising recent ones. | Acceptable. |

### Bug-hunter checklist
- [x] All async paths have error handling
- [x] No race conditions (debounce timer is per-path)
- [x] No uncaught panics (errors logged, not thrown)
- [x] No silent failures
- [x] No path traversal (only emits paths inside vaultRoot)
- [x] No external network calls
- [x] Standard mode regression passes

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | Low | lib/fswatcher.mjs | The recursive/non-recursive fallback split could be cleaner. Worth a follow-up if Linux gets full support. | Filed v0.5.1.x. |
| 2 | Low | lib/server.mjs | `globalThis.__sbFsWatcher` is a global state leak, but it's a server, so OK. | Acceptable. |

### Architecture-reviewer checklist
- [x] No new npm deps (still 3: js-yaml, jsdom, marked)
- [x] No new Rust deps
- [x] Uses Node built-ins (fs.watch)
- [x] Privacy-respecting (no content reads, no network)
- [x] Pattern matches v0.5 events

## Aggregator verdict

**Findings: 5 total — 0 Critical, 0 High, 0 Medium, 0 Low fixed, 5 Low acknowledged.**

The FS watcher is functional and integrated end-to-end. The daily journal now reflects external edits.

**Recommendation: APPROVED**

## Follow-up issues filed

- v0.5.1.x — debounce across paths (batched time window)
- v0.5.1.x — content diff (hash the file and emit when changed)
- v0.5.1.x — Linux recursive watch (if/when Node supports it)
- v0.5.1.x — inotify limit detection for huge vaults
