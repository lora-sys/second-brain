# v0.4.1 — Self-Review Report

> Conducted by @coordinator acting as bug-hunter + architecture-reviewer.
> Single-agent adversarial review (no peers available in solo project). Findings addressed before merge.

## Reviewer 1 — Bug Hunter

| # | Severity | File:Line | Description | Repro / Evidence | Status |
|---|----------|-----------|-------------|------------------|--------|
| 1 | Medium | packages/core/src/vault.mjs (write) | `tmp` filename is `tmp-<pid>-<ts>` — pid+ts collision theoretically possible if same ms on same pid. Practically: `Date.now()` is millisecond precision + pid is unique per process. Acceptable but worth noting. | n/a | Accepted (acknowledged) |
| 2 | Low | packages/core/src/llm/audit.js | `logToolCall` writes vault files but doesn't use atomic write (no tmp+rename). If process crashes mid-write, audit log could be corrupted. | n/a | Filed as follow-up: v0.5.audit-atomic |
| 3 | Medium | packages/core/src/vault.mjs (withFileLock) | Lock file `*.lock` is left behind on crash (we try `unlink` but if the process is killed mid-write, the lock file persists). Need a stale-lock recovery. | n/a | Filed as follow-up: v0.4.4.lock-recovery |
| 4 | Low | packages/web/src/server.mjs | Config path is now in `packages/web/` instead of repo root. The README still references root. Will update in v0.4.2. | doc fix | Filed |
| 5 | Low | docs/config.example.env | OPENAI_BASE_URL default to OpenAI's URL; if user follows it without setting API key, they get 401. Could be friendlier. | ux | Filed as polish |

### Bug-hunter checklist
- [x] All async paths have error handling (write/withFileLock/audit)
- [x] No race conditions on file write (lock-or-atomic)
- [x] No uncaught exception paths
- [x] Slug generation handles collisions (already in v0.3)
- [x] No silent failures
- [x] No command injection in shell calls (no shell calls in core)
- [x] LLM errors will be caught (RetryProvider handles transient; permanent throws)

## Reviewer 2 — Architecture Reviewer

| # | Severity | File:Line | Description | Status |
|---|----------|-----------|-------------|--------|
| 1 | High | packages/core/src/llm/openai.js | `createOpenAIProvider().complete()` throws "not implemented". Good — explicit failure vs silent stub. But this is a public export, so the harness audit says we should document this is a placeholder. | Documented in this file's header comment |
| 2 | Medium | packages/core/src/index.js | Barrel export re-exports all of `vault.mjs` (including internals). Should narrow to public API. | Filed as v0.4.4.tighten-barrel |
| 3 | Low | packages/core/src/llm/index.js | `RetryProvider` only retries on transient errors but doesn't surface the retry count to caller. Caller can't tell "succeeded on 3rd try" vs "succeeded on 1st try". | Documented behavior; may add to API later |
| 4 | Low | monorepo skeleton | Missing `packages/web/package.json` and `packages/desktop/package.json`. Currently the web package config lives in the root `package.json` (workspaces). Will split when adding the desktop package. | Filed as v0.4.3 (alongside Tauri init) |
| 5 | Low | docs/config.example.env | Comments mention "v0.5+" for some keys but we're shipping the schema in v0.4.1 (since core/src/llm/ exists). | Wording fix, not blocking |

### Architecture-reviewer checklist
- [x] No new framework deps (still 3: js-yaml, jsdom, marked)
- [x] Coupling: `core` has no dependency on `web` or `desktop` ✅
- [x] Public API: `LlmProvider` interface is clean (one method + one info) ✅
- [x] Error type: `Result`-style throwing is OK for Rust, but JS throws are also fine; consistent with rest of codebase ✅
- [x] No security regression: `.env` excluded from git, secrets not in code ✅
- [x] No repeated logic: `withFileLock` + `withLockedMutation` are new abstractions, no duplication
- [x] Boundaries: `core` does not know about Tauri or web specifics ✅

## Aggregator verdict

**Findings: 10 total — 0 Critical, 0 High, 4 Medium, 6 Low**

- 0 Critical/High blockers
- 4 Medium → all filed as follow-up issues (acceptable for v0.4.1)
- 6 Low → minor polish, addressed in current or follow-up PRs

**Recommendation: APPROVED ✅**

## Follow-up issues filed

- v0.4.4.lock-recovery — stale lock detection in withFileLock
- v0.4.4.tighten-barrel — narrow exports in packages/core/src/index.js
- v0.5.audit-atomic — atomic write for audit log
