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

## v0.4.6 — Tauri build pipeline

### Local build

Requires `cargo`, `rustc`, `cargo-tauri`, and these system packages
(on Arch Linux):

```
pacman -S webkit2gtk-4.1 base-devel curl wget file
```

On Debian/Ubuntu:

```
apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
            librsvg2-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev \
            patchelf build-essential curl wget file
```

Build the optimized binary + .deb bundle (3 minutes cold, ~30s warm):

```bash
cd src-tauri
cargo tauri build --bundles deb
# Output: src-tauri/target/release/second-brain  (11MB binary)
#         src-tauri/target/release/bundle/deb/Second Brain_0.4.0-alpha_amd64.deb  (3MB)
```

Build all bundle types (AppImage + .deb + .rpm):

```bash
cd src-tauri
cargo tauri build
```

Note: the AppImage build path uses `linuxdeploy` which currently
fails on Arch Linux (Aug 2026) with a "No such file or directory" error
from an empty path. This is an upstream `linuxdeploy` issue, not a
Tauri config issue. The .deb and .rpm paths work.

### CI / Release pipeline

`.github/workflows/release.yml`:

- Triggered by `git tag v*` or manual `workflow_dispatch`
- Runs on `ubuntu-22.04`
- Installs Tauri build deps via apt
- Runs `cargo tauri build` with the requested bundles
- Uploads `.deb`, `.AppImage`, `.rpm` (if present) and the raw
  binary as GitHub artifacts
- On tag push: creates a **draft** GitHub release with all artifacts
  attached and auto-generated release notes

To cut a release:

```bash
# Bump version in src-tauri/tauri.conf.json and src-tauri/Cargo.toml
# Update CHANGELOG.md
git commit -am "chore: bump version to 0.4.0"
git tag v0.4.0
git push origin v0.4.0
# CI runs, uploads artifacts, opens draft release
# Edit the release notes, publish
```

### Install (on a Linux machine with apt)

```bash
sudo dpkg -i "Second Brain_0.4.0-alpha_amd64.deb"
sudo apt-get install -f   # resolve any missing deps
second-brain               # launch
```

### Identifier

`com.secondbrain.desktop` (was `com.secondbrain.app` which conflicted
with the macOS app bundle extension). v0.4.6 fixed this warning.
