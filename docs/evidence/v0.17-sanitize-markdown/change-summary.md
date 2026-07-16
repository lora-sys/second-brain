# v0.17 — Sanitize Markdown Output (XSS Hardening) · Change Summary

## What changed

`marked.parse()` produced raw HTML that flowed straight into `innerHTML`. Any
`<script>`, `onerror`, `javascript:` URL, or exotic tag in a vault body (or in
MCP-vendored / LLM-generated content) would execute in the user's session.
v0.17 wraps every `marked.parse()` output through an allowlist sanitizer before
it touches the DOM.

## Implementation

### New files

- **`public/lib/sanitize.js`** — browser-side sanitizer (143 lines). Uses native
  `DOMParser`. Exposes `window.sbSanitize.html(html)` returning the safe string.
  No new deps.
- **`lib/sanitize.mjs`** — server-side mirror (141 lines). Same allowlist, runs
  in Node via `jsdom` (already a dep). Exposes `sanitizeHtml`, `sanitizeText`.
- **`tests/sanitize.test.mjs`** — 31 unit tests covering: `<script>`, `<iframe>`,
  `javascript:` href/src, `data:` URLs, `on*=` event handlers, `style=`,
  `<!doctype>` stripping, the markdown-renderer's normal output, the iframe
  embed-hosts allowlist, and edge cases (null/undefined/empty).

### Allowlist rules

- **Tags allowed**: `p, br, hr, h1-h6, strong, b, em, i, s, del, ins, u, mark,
  small, ul, ol, li, dl, dt, dd, blockquote, q, cite, code, pre, kbd, samp,
  var, a, img, iframe, table/thead/tbody/tfoot/tr/th/td/caption, span, div,
  figure, figcaption, sub, sup`.
- **Attributes allowed**: `a[href,title,rel,target]`,
  `img[src,alt,title,width,height,loading]`, `iframe[src,allow,allowfullscreen,
  width,height,frameborder,title]`, `th[align], td[align]`, plus `class`
  anywhere.
- **URL filter**: `href` and `src` rejected if they start with `javascript:`,
  `vbscript:`, or `data:` (case- and whitespace-insensitive).
- **iframe host filter**: iframe `src` is parsed and its hostname must be in
  `EMBED_HOSTS = [www.youtube.com, youtube.com, youtu.be, player.vimeo.com,
  player.bilibili.com]`. Otherwise the entire `<iframe>` element is removed.
- **`<script>` is removed** unconditionally (not just unwrapped).
- **on* event handlers** are not in any tag's allowlist → stripped.
- **`style=`** not in any allowlist → stripped (CSS injection blocked).
- **`target=`** must match `/^[._a-zA-Z0-9-]{1,32}$/` (no JS in targets).
- **`class=`** must match `/^[\w\-./ ]*$/` (no spaces-of-mischief).

### Modified files

- **`public/index.html`** — added `<script src="/lib/sanitize.js">` before
  `/lib/wikilink.js`. Load order: `marked.min.js` → bridge/state/icons/api →
  **sanitize** → wikilink → cockpit → app.
- **`public/app.js`** — `renderMarkdown` now calls
  `window.sbSanitize.html(html)` at the end of its pipeline (after marked +
  upgradeEmbeds + applySmartMentions). Used by every entity detail page
  (notes / tasks / projects / people / links / decisions).
- **`public/lib/cockpit.js`** — `renderLatestReflection` now wraps the weekly
  `marked.parse()` output through the sanitizer.

### What did NOT change

- Skill viewer (`openSkillViewerModal`) was already safe — it renders
  `skill.body` as `<pre>${esc(...)}</pre>`, no marked.
- Skill chips, agent messages, modal bodies — all unchanged; their inputs go
  through `esc()` already, or are DOM-built via `document.createElement`.
- No new npm deps. `jsdom` was already in the project's 3-dep budget.

## Verification

### Unit tests
```
$ npm run check
…
31 passed, 0 failed
```

### E2E tests added (`tests/e2e/real-device.mjs`)
Seven new tests after the v0.14 insight block:
- `sanitize: window.sbSanitize loaded` — API surface check
- `sanitize: <script> stripped from injected HTML` — verify NO `<script>` in
  result and the script body did not run
- `sanitize: javascript: href dropped` — `href` no longer starts with `javascript:`
- `sanitize: onerror handler stripped` — img with `onerror=...` has no onerror
- `sanitize: trusted youtube iframe kept` — embed host survived
- `sanitize: hostile iframe fully removed` — non-embed host stripped entirely
- `sanitize: renderMarkdown pipeline is safe end-to-end` — full pipeline check

The full real-device.mjs suite (currently 81+ tests) is unchanged otherwise.

## Privacy

Sanitization is local; no data is sent to a remote API.

## Tradeoffs / follow-ups

- **iframe allowlist is opinionated.** Add new providers (loom, twitter, etc.)
  by appending to `EMBED_HOSTS`.
- **Server-side `lib/sanitize.mjs` is exported but unused** by current HTTP
  routes — kept ready for v0.20+ if the server ever returns rendered HTML
  instead of raw markdown.
- **No CSP** on the page; this sanitizer is the only defense. CSP header
  (`default-src 'self'`) is a future hardening (separate ADR).
- **`<style>` allows attribute**: not yet added back, but tiny inline styling
  could be supported later by an explicit per-rule CSS allowlist.

## Why this matters for v0.30 (real LLM)

When we wire real OpenAI / Ollama calls, the LLM could output `<script>` or
`javascript:` calls in skill bodies and reflection prompts. Without
sanitization, those would execute against the user's vault session. v0.17 is
the prerequisite defense layer.
