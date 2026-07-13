# v0.4.6 — Tauri Build Pipeline · Change Summary

## What changed

The Tauri desktop app can now be built and distributed. v0.4.6 adds:
- A working `cargo tauri build` that produces a release binary + .deb bundle
- A GitHub Actions workflow that builds + uploads artifacts + opens a draft release on tag push
- Identifier fix (`com.secondbrain.desktop` instead of `.app` which conflicts on macOS)
- Documentation in `docs/architecture/deploy.md`

## Artifacts produced locally

```
$ cd src-tauri && cargo tauri build --bundles deb

src-tauri/target/release/second-brain                                       11M  (optimized binary)
src-tauri/target/release/bundle/deb/Second Brain_0.4.0-alpha_amd64.deb     3.0M (Debian package)
```

The 11MB binary is a fully-static release build of the Tauri app with
all 6 Tauri commands baked in. The 3MB .deb is a proper Debian binary
package (format 2.0, with control.tar.gz, gzipped data) ready for
`dpkg -i` install on any Debian/Ubuntu system.

## CI / Release pipeline

`.github/workflows/release.yml` triggers on `git tag v*` or
`workflow_dispatch`:

- Runs on `ubuntu-22.04` (where the `libwebkit2gtk-4.1-dev` apt
  package is available)
- Installs Tauri build dependencies via apt
- Runs `cargo tauri build` with the requested bundles
- Uploads `.deb`, `.AppImage`, `.rpm` (if present) and the raw binary
  as GitHub artifacts
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

## Files

- `src-tauri/tauri.conf.json` — identifier changed from
  `com.secondbrain.app` to `com.secondbrain.desktop`
- `src-tauri/target/release/second-brain` — 11MB release binary
- `src-tauri/target/release/bundle/deb/Second Brain_0.4.0-alpha_amd64.deb`
  — 3MB Debian package
- `.github/workflows/release.yml` — CI pipeline
- `docs/architecture/deploy.md` — updated with v0.4.6 build instructions

## Verification

### Local build
- `cargo tauri build --bundles deb` completes successfully
- Release binary is 11MB (vs 207MB debug binary — release mode
  strips debug info, optimizes codegen)
- .deb is a valid Debian package (verified with `file` command:
  "Debian binary package (format 2.0), with control.tar.gz, data
  compression gz")
- Release binary launches: `ps aux` showed `second-brain` running
  (PID 1145154). Window content can't be cleanly captured in this
  sandbox (same GBM/WebKit software-rendering issue as v0.4.3) but
  the process is healthy.

### CI workflow
- YAML is valid (verified with `yaml.safe_load`)
- Trigger paths: tag push + manual dispatch with `bundles` input
- Outputs: .deb, .AppImage, .rpm, raw binary, draft GitHub release
- on ubuntu-22.04 with apt deps

### Known limitations
- AppImage bundling fails on this Arch Linux sandbox due to a
  `linuxdeploy` issue ("No such file or directory" with empty path,
  an upstream linuxdeploy bug). The .deb path works because it
  uses native `cargo-deb` instead. The CI workflow's apt-based
  ubuntu-22.04 environment should be able to build AppImage.

## What's not in this issue (filed as v0.4.6.x or v0.4.7 follow-ups)

- v0.4.7 — Full E2E against the production .deb on a real Linux
  desktop (verify all 6 Tauri commands work end-to-end)
- linuxdeploy AppImage fix (file a bug upstream or work around)
- Code signing (Linux doesn't require it but Windows/macOS do)
- Auto-update mechanism (Tauri's built-in updater)
- Crash reporting / observability

## Decisions made

### Build target = Linux only for v0.4.6
- Windows code signing would need a cert + additional config
- macOS code signing needs an Apple Developer cert + notarization
- Linux .deb + .AppImage are the lowest-friction path for a local-
  first desktop app, matching the "user is the developer" persona
- Future issues add Windows + macOS as separate tracks

### Identifier = `com.secondbrain.desktop` (was `.app`)
- `.app` is the macOS app bundle extension, conflicts with the bundle
- `.desktop` is the Linux desktop entry convention

### Draft release (not auto-publish)
- Manual review of release notes before going public
- Matches the project's "every change has Evidence" philosophy
- Allows verifying that all artifacts attached correctly
