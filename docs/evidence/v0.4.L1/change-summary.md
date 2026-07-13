# v0.4.L1 — Landing Page · Change Summary

## What changed

`docs/index.html` — a single-file landing page for Second Brain OS. Public
face for the project: explains what it is, lists the features,
shows the architecture, and links to the .deb download + GitHub.

## Layout

1. **Topbar** — brand + nav (Features / Architecture / GitHub / Install)
2. **Hero** — eyebrow ("v0.4 · Local-first · Obsidian-native"), big H1
   ("The personal *cognitive OS* for a single user who wants their
   notes, tasks, and reflection to actually *work together*."), subtitle,
   3 CTAs (Download .deb, View GitHub, Architecture)
3. **Features** — 6 features in a 2-column grid:
   - 4 entity types, one keyboard
   - Cockpit view, not a file tree
   - Full-text search across the vault
   - Atomic writes + file locks
   - 9 Tauri commands, full local API
   - Light + dark, system-aware
4. **Architecture** — 4 stat pillars (11MB, 3MB, 9, 41+) + code sample
   showing frontmatter shape
5. **Install** — 3-step guide (Download / Install / Use)
6. **Roadmap** — future version preview (v0.5 to v0.8) with key features
7. **Footer** — copyright + links to GitHub/Docs/Build/Status

## Design tokens

Uses the same design system as the SPA:
- 4 type colors (person/task/project/link) for accents and dots
- Fraunces for display, Inter for body, JetBrains Mono for code
- Brand mark = 4-quadrant gradient square
- Light + dark via `prefers-color-scheme` media query
- CSS custom properties throughout (no Tailwind, no framework)

## Files

- `docs/index.html` (new) — 18.6 KB single-file landing page, no JS, no
  dependencies, no build step

## Verification

### Page loads (file:// protocol)
- Title: "第二大脑 · Second Brain OS"
- H1: "The personal cognitive OS for a single user who wants their
  notes, tasks, and reflection to actually work together."
- 6 features, 4 architecture pillars, 3 install steps, 3 http links
- 4 sections with h2 headers (Features, Architecture, Install, Roadmap)
- Console: 0 errors, 0 warnings

### Standard v0.3 mode (regression)
- v0.3 dashboard renders unchanged
- Console: 0 errors, 0 warnings

Screenshots:
- `01-landing.png` — full landing page, full-page screenshot
- `02-v3-standard-regression.png` — standard v0.3 unchanged

## Decisions made

### Single-file, no JS
- 18.6 KB plain HTML + inline CSS. No build step. No framework. No JS.
- Hosts on any static server: nginx, GitHub Pages, Caddy, or even
  file://. The user can also just open the file locally.
- This matches the project's "no build, no framework" philosophy
  (see AGENTS.md).

### Design tokens match the SPA
- Same fonts (Fraunces / Inter / JetBrains Mono)
- Same brand mark
- Same type-color identity (orange / sky / violet / emerald)
- Same accent patterns (rgba with low alpha for soft tints)
- A user who has used the SPA recognizes the visual language

### Download CTA → #install (anchor) for now
- The .deb download URL is the GitHub Releases URL (filled in after
  the first tagged release). For now, the link goes to the install
  section, which describes the dpkg command.
- Filed v0.4.L1.x: update the download URL to point at the latest
  GitHub release artifact once we tag v0.4.0.

### Pre-existing design tokens lifted into the page
- Reused `--type-person`, `--type-task`, `--type-project`,
  `--type-link`, `--accent`, `--font-display`, `--font-sans`,
  `--font-mono`, etc.
- This makes the landing page feel like part of the same product
  (rather than a generic marketing site).

## What's not in this issue (filed as v0.4.L1.x or v0.4.L2)

- v0.4.L1.x — update download URL to latest GitHub release artifact
- v0.4.L2 — GitHub Pages deploy workflow (.github/workflows/pages.yml)
- v0.4.L2 — custom domain support (e.g. secondbrain.dev)
- v0.4.L2 — OpenGraph meta tags for social sharing
- v0.4.L2 — analytics (probably none, per project philosophy)
- v0.4.L1.x — favicon (currently uses inline data URI; would be a real
  PNG export for better mobile support)
