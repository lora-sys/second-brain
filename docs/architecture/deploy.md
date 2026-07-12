# Deploy

## Channels

- **Web showcase** (v0.4 TBD): static deploy of `public/` to a personal server or GitHub Pages
  - Optional: the user can run `npm start` and access `http://localhost:3939` for full functionality
- **Tauri desktop** (v0.4 target): Linux AppImage + .deb on GitHub Releases
  - Auto-update via Tauri updater (can be disabled)
  - x86_64 first, arm64 later
- **Web SPA on the desktop**: bundled inside the Tauri shell, loaded from `tauri://localhost`

## Build pipeline (v0.4 target)

```yaml
# .github/workflows/release.yml
on: { push: { tags: ['v*'] } }
jobs:
  build:
    strategy: { matrix: { target: [appimage, deb] } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build:web
      - uses: tauri-apps/tauri-action@v0
        with: { tagName: ${{ github.ref_name }} }
```

## Versioning

- Semantic Versioning (semver.org)
- Tag format: `vMAJOR.MINOR.PATCH` (e.g., `v0.4.0`)
- CHANGELOG.md updated per release
- GitHub Release per tag, with artifacts attached

## Branching

- `main` is the always-shippable branch
- `feature/#<id>-<short>` for new work (per Issue)
- `release/vX.Y` for release prep
- Hotfixes: `hotfix/<short>` branched from main
