# v0.4.L2 — GitHub Pages Deploy · Change Summary

## What changed

Two things to make the landing page actually public:

1. **`.github/workflows/pages.yml`** — GitHub Actions workflow that
   builds `docs/index.html` → `gh-pages` branch on every push to main.
2. **OpenGraph meta tags** on the landing page so social sharing
   (Twitter, LinkedIn, etc.) shows the right title/description.

## Workflow

The workflow:
- Triggers on push to `main` (or `workflow_dispatch`)
- Validates the landing page (file exists, key sections present)
- Sets up the Pages artifact directory
- Copies `docs/index.html` → `_site/index.html`
- Creates a simple Chinese 404 page (`_site/404.html`)
- Adds `.nojekyll` (so Pages serves the file as-is, not as Jekyll)
- Uploads as Pages artifact → deploys to `https://<org>.github.io/<repo>/`

## OpenGraph

Added to `<head>`:
- `og:type=website`, `og:title`, `og:description`, `og:locale=zh_CN`
- `twitter:card=summary`, `twitter:title`, `twitter:description`

## Files

- `.github/workflows/pages.yml` (new) — Pages deploy workflow
- `docs/index.html` (modified) — added 7 OG/Twitter meta tags

## Verification

### Landing page (file:// protocol)
- 0 console errors, 0 warnings
- 6 features, 4 architecture pillars, 3 install steps render correctly
- OpenGraph meta tags present in `<head>`

### Workflow validation
- YAML is valid (verified with `yaml.safe_load`)
- Workflow file structure follows GitHub Actions standards
- Permissions set correctly: contents:read, pages:write, id-token:write

## Decisions made

### Use actions/deploy-pages@v4 (latest stable)
- The v4 actions are the current recommendation as of 2025
- Includes the new `setup-pages` action that auto-resolves the
  GitHub API URL

### Add a simple 404 page
- Without one, GitHub Pages falls back to a generic 404. The
  custom one in Chinese matches the rest of the site and gives a
  "back to home" link.

### Don't use Jekyll
- Added `.nojekyll` so GitHub Pages serves the file as-is. We
  don't have any Jekyll-style frontmatter in `docs/index.html`.

### OpenGraph + Twitter Card
- Both protocols covered. LinkedIn, Slack, Discord, etc. use
  OpenGraph; Twitter uses Twitter Card. Adding both covers most
  social sharing.

## What's not in this issue (filed as v0.4.L2.x or v0.4.5)

- v0.4.L2.x — custom domain (e.g. secondbrain.dev) via CNAME file
- v0.4.L2.x — Schema.org structured data (Organization + SoftwareApplication)
- v0.4.5 — when the first tagged release ships, the download CTA on
  the landing page should point to the .deb in the GitHub release,
  not the install section
- v0.4.L2.x — periodic update: the landing page stats (11MB, 3MB, 9, 41+)
  will go stale as we add more commands / tests. Add a small CI job
  to auto-update from the build artifacts.
