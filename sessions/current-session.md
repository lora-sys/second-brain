# Current Session

> Pointer to the active multi-agent run. Last updated: 2026-07-12 by @coordinator.

## Active session

`sessions/2026-07-12-bootstrap/`

## What's in it

- `inventory.md` — repo state at session start
- `plan.md` — bootstrap plan
- `status.md` — running kanban
- `summary.md` — written at end of session

## How to resume

1. `cat sessions/current-session.md` (this file)
2. `cd sessions/$(ls -t sessions/ | head -1)` (the most recent session)
3. `cat status.md` to see where we left off
4. Pick up the next Todo in `PROJECT_STATUS.md`
