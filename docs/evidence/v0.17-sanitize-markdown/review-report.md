# v0.17 — Sanitize Markdown · Adversarial Review

## Self-review (Coordinator)

### Bug-hunter

- **iframe removal when src is `javascript:`** — verified: node tests/sanitize.test.mjs passes the iframe-fully-removed case. Empty `<iframe></iframe>` would have been a regression; caught & fixed during authoring. Smoke verified with `<iframe src="javascript:alert(1)">` and `<iframe src="https://evil.example/x">`.
- **`<script>` tag survival** — fully scrubbed before DOM assignment (re-parse after sanitize). No nodes with name `script` survive.
- **`<style>` attributes** — not in any allowlist; stripped.
- **`data:text/html` URLs** — covered by DANGEROUS_URL regex, rejected.

### Behavior reviewer

- **No functional regression for legitimate markdown.** Marker tests assert typical marked-rendered output is unchanged byte-for-byte (h2, p, strong, ul, li, pre, code, blockquote, table/thead/tbody/tr/th/td).
- **Existing video embeds (youtube/vimeo/bilibili) preserved.** `renderMarkdown` calls `upgradeEmbeds` first → produces `<iframe src="www.youtube.com/embed/...">` → sanitizer keeps it because host is in `EMBED_HOSTS`.
- **Wikilinks preserved.** `applySmartMentions` builds `<a class="wikilink auto-mention">` via `document.createElement` (DOM-construction, not string injection). Sanitizer step applies to the final string only; final DOM is fresh from a re-parse so it never inherits the innerHTML parse of the earlier string.
- **Empty inputs** — null / undefined / `''` all return `''` cleanly, no exceptions.

### Architecture reviewer

- **Allowlist maintained in two places** (`public/lib/sanitize.js` and `lib/sanitize.mjs`). Risk of drift is real; the two files are kept small and the section comments call them out. If the allowlist grows substantially, factor into a shared config — but two 140-line modules in sync is still cheaper than the build/import machinery to share one source.
- **Module boundaries** — sanitize.js exposes `window.sbSanitize.{html,_allowed,_embedHosts}`. No internals leak.
- **No new npm deps.** Within AGENTS.md §6 "3 npm deps max".
- **Load order in `public/index.html`** — sanitize is loaded before cockpit.js and app.js; both consumers check `window.sbSanitize` defensively before calling.

### Security reviewer

- **Threat model**: vault content is user-controlled. Future MCP/LLM-sourced content is attacker-controlled. Defense-in-depth at the rendering boundary is correct.
- **Bypass paths reviewed**:
  - `<svg><script>alert(1)</script></svg>` — `<script>` removed at top level and stripped inside `<svg>`. Walk untags any non-allowlisted tag.
  - `<a href="  JavaScript:alert(1)">` — case- and whitespace-insensitive regex catches it.
  - `<a href="javasc&#114;ipt:alert(1)">` — entity-encoded `javascript:`. **NOT covered.** This is a known limitation; would need html-entity decoding pre-URL-check. Filed as known limitation.
  - `<img src=x onerror=alert(1)>` — `onerror` is not in the allowlist; removed.
  - `<iframe srcdoc="<script>…</script>">` — `srcdoc` not in allowlist for iframe; removed.
  - `javascript:` on a `formaction=` — `formaction` not in the allowlist; removed.
  - CSS that does `background-image: url("javascript:...")` — `style=` attributes are stripped, so this can't be set inline. Inline `<style>` blocks are not in allowlist and would be unwrapped.
- **CSP is recommended as defense-in-depth** but not added in this PR (separate effort, would change HTTP response headers).

### UI reviewer
N/A — no visible UI change.

## Test tally

- Unit: 31/31 pass
- Server CLI: passes `node --check`
- Browser JS: passes new Function parse (sanitize.js, app.js, cockpit.js)
- Manual curl: `GET http://127.0.0.1:3940/lib/sanitize.js` returns the script; `GET http://127.0.0.1:3940/` includes `<script src="/lib/sanitize.js">` in the head.
- Live browser E2E: blocked by HTTP-proxy sandbox environment in this dev session. Coverage in `tests/e2e/real-device.mjs` is ready for any CI / non-sandbox browser run.

## Known limitations (filed for later)

1. HTML entity encoding bypass (`& # 1 0 6;avascript:` style) — sanitizer doesn't decode entities before URL check. Acceptable for v0.17 since vault content is user-authored; revisit before opening any path that ingests untrusted markdown.
2. No CSP header. Add `Content-Security-Policy: default-src 'self'; script-src 'self' https://www.youtube.com https://player.vimeo.com https://player.bilibili.com; frame-src https://www.youtube.com https://player.vimeo.com https://player.bilibili.com` as defense-in-depth.
3. Inline `<style>` could be re-introduced for code/pre formatting later. Currently stripped.
