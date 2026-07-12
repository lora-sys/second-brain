# Security

## Threat model

- **The user is the only user.** No multi-tenancy, no auth, no accounts.
- **The user trusts themselves.** They run this on their own machine.
- **External threat = malware on the same machine** (low bar) and **accidental data leak via LLM API** (higher bar).

## Local-only

- HTTP server binds to `127.0.0.1` only. No LAN access.
- Tauri capabilities are minimal. No `tauri-plugin-shell` for the WebView. FS access is scoped to the user-chosen vault directory.
- No outbound network calls except:
  - User-initiated link import (fetches the URL)
  - Optional API calls (per ADR-0002, opt-in per session)
  - Tauri auto-update check (can be disabled)

## Vault safety

- Atomic writes only (temp + rename).
- Lenient frontmatter parse — never corrupt a file because of bad YAML.
- No automatic schema migrations on the vault. The app must work with old data formats.

## LLM

- Local LLM by default. No data leaves the machine.
- API opt-in shows a visible toast: "your content was sent to <provider>."
- Prompts and responses stored in vault under `00-AI/prompts/` and `00-AI/responses/` for audit.
- User can disable LLM features entirely in Settings.

## Future

- TBD v0.9: signed skill bundles (when skill sharing is added)
- TBD v0.10: encrypted vault for shared machines
- TBD v0.11: opt-in sync (Syncthing-friendly, no central server)

## Reporting

If you find a security issue, please open a private issue or email `lora@...`. Do not file a public Issue for vulnerabilities.
