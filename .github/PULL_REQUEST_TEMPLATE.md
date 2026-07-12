## Related Issue
- Closes #

## Summary
<2–4 bullets describing what changed>

## Motivation
<why; cite Issue/ADR IDs>

## Changed Files
- key files (auto by GitHub)

## Architecture Impact
- New module? Cite ADR or commit to writing one.
- Schema change? Cite migration + rollback.
- Public API change? Cite `docs/api/...` and version note.

## Testing
- Unit: <% coverage delta>
- Integration / contract:
- E2E / browser evidence: <link to docs/evidence/<id>/>

## Evidence
- docs/evidence/<id>/change-summary.md
- docs/evidence/<id>/test-results/
- docs/evidence/<id>/screenshots/

## Reviewer Coverage
- [ ] bug-hunter
- [ ] behavior-reviewer
- [ ] architecture-reviewer
- [ ] ui-reviewer (if UI change)
- [ ] security-reviewer (if auth/PII/secrets)

## Definition of Done
- [ ] All ACs in the linked Issue green
- [ ] `npm run check` passes
- [ ] E2E tests green
- [ ] No console errors
- [ ] No unhandled rejections in server log
- [ ] Evidence complete
- [ ] Reviewer reports attached
- [ ] PROJECT_STATUS.md updated
- [ ] ADR filed (if architecture-affecting)
