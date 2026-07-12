# Frontend

## Stack

- Vanilla JS, native HTML/CSS, no build step, no framework
- Web fonts: Fraunces (display) + Inter (UI) + JetBrains Mono (code), from Google Fonts with system fallbacks
- Markdown: `marked` v14 with custom renderer
- WYSIWYG: plain `<textarea>`, with wikilink autocomplete

## Boundaries

- `public/app.js` (single file) — application logic
- `public/lib/wikilink.js` — global [[ autocomplete module
- `public/style.css` — design tokens + component styles
- `public/index.html` — single page shell

## Constraints (from AGENTS.md)

- No React / Vue / Tailwind / bundler
- ≤ 3 npm deps (currently: js-yaml, jsdom, marked)
- 2-space indent, single quotes, BEM-ish CSS
- Vanilla `<input>` / `<textarea>` — no contenteditable

## Tauri Integration (v0.4)

- Replace `fetch('/api/...')` with `window.__TAURI__.invoke('cmd_name', args)`
- Same response shape, just async via IPC
- `public/lib/wikilink.js` stays as-is (no Tauri dependency)
- `public/style.css` gets a few new selectors for native-feel (window controls, etc.)
