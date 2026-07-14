# v0.4-6a — Skeleton States · Change Summary

## What changed

Replaces the generic spinner with type-aware skeleton placeholders that match the shape of the content being loaded. Both standard and cockpit routes use them.

## Implementation

- `public/app.js`
  - New `renderSkeleton(main, routeName)` for standard v3 mode
  - `handleRoute` calls it before route resolution
  - 4 route-specific shapes: `tags` (chips), `notes` (rows), `agent` (hero + grid), `daily`/`weekly` (blocks)
- `public/lib/cockpit.js`
  - New `renderCockpitSkeleton(content, route)` for cockpit mode
  - `renderContent` calls it before route resolution
  - 7 route-specific shapes: `tags`, `notes`, `agent`, `daily`, `weekly`, `decisions`, `skills`
- `public/style.css`
  - `.cockpit-skeleton` — base container
  - `.skeleton-chip`, `.skeleton-row`, `.skeleton-dot`, `.skeleton-line`, `.skeleton-hero`, `.skeleton-grid`, `.skeleton-card`, `.skeleton-block`
  - `@keyframes skeleton-shimmer` — left-to-right gradient sweep
  - `@keyframes skeleton-pulse` — opacity pulse for dots

## Behavior

When you click a sidebar link, the new route shows:
- A shimmer animation moving across placeholder shapes
- The shapes match the content type (chips for tag pages, cards for the agent, blocks for daily/weekly/decisions)
- Real content replaces the skeleton once data loads

## Verification

### Manual smoke test

Click a sidebar link in the cockpit (e.g. 笔记库, 智能体, 周报):
- For ~100-200ms before content loads, the skeleton shows
- Shimmer animation plays
- Real content fades in

The skeleton is brief because the local data loads fast. The visible value is mainly when the data is slow (large vault, first load).

## Tradeoffs

- **Brief visibility** — local data is fast, so skeleton may flash for 100-200ms. Real value would be at scale.
- **No animation refinement** — no fade-in transition between skeleton and real content. Filed v0.4-6a.x.
- **Standard mode shapes are limited** — only 4 routes have custom shapes. Could expand. Filed v0.4-6a.x.

## Performance

Pure CSS animations. No JS overhead. The skeleton DOM is simple placeholder divs/spans that get replaced atomically when content loads.
