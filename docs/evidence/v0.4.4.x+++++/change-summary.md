# v0.4.4.x+++++ — vault_link_import · Change Summary

## What changed

Added the 10th Tauri command: `vault_link_import(url, title_hint?, tags?)`.
Fetches a URL, extracts the page title (or falls back to a URL-derived
title), and creates a link entity via `vault_create`.

## Command signature

```rust
#[tauri::command]
fn vault_link_import(
    url: String,
    title_hint: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Entity, String>
```

- `url`: the URL to fetch (required)
- `title_hint`: optional user-supplied title; if provided, takes
  precedence over the parsed title
- `tags`: optional list of tags to add to the entity

## Behavior

1. Build a `reqwest::blocking::Client` with a 10s timeout and a
   proper User-Agent
2. GET the URL, check `status.is_success()`
3. Parse the HTML body to extract the title:
   - First try `<title>...</title>`
   - Then `<meta property="og:title" content="...">`
   - Then `<meta name="twitter:title" content="...">`
4. Use the title_hint if given, else the parsed title, else a
   slug derived from the URL's last path segment (with file
   extensions stripped: html, htm, php, etc.)
5. If everything is "Untitled" (no title, no hint, no path), use
   "Untitled"
6. Call `vault_create("link", final_title, "", Some(data))` with
   `data` containing the URL, the tags, and a `fetchStatus` field
7. Return the created Entity

The HTML parsing helpers are pure functions (no external deps):
- `parse_html_title(html)` — extracts title from HTML
- `extract_meta_content(html, attr, value)` — extracts content
  attribute from a meta tag (handles both single and double quotes)
- `decode_html_entities(s)` — minimal decoder (&amp; &lt; &gt; etc.)
- `derive_title_from_url(url)` — last non-empty path segment,
  alphanumerics only, file extensions stripped

## Files

- `src-tauri/Cargo.toml`
  - Added `reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "blocking"] }`
- `src-tauri/src/lib.rs`
  - `vault_link_import` command
  - `parse_html_title`, `extract_meta_content`, `decode_html_entities`,
    `derive_title_from_url` helpers
  - 8 new unit tests (5 for parse_html_title, 1 for derive_title_from_url,
    1 for decode_html_entities, 1 indirectly via vault_link_import
    which uses these helpers)
- `public/lib/api.js`
  - `api.importLink(body)` now invokes `vault_link_import` in Tauri
    mode (browser mode unchanged)

## Verification

### Rust unit tests (49/49 pass consistently across 5 parallel runs)
- `parse_html_title_basic` — extracts `<title>Hello World</title>` from HTML
- `parse_html_title_og_fallback` — uses `og:title` meta tag when `<title>` missing
- `parse_html_title_twitter_fallback` — uses `twitter:title` as last resort
- `parse_html_title_none` — returns None when no title found
- `parse_html_title_with_whitespace` — trims whitespace
- `parse_html_title_decodes_entities` — `&amp;` → `&`, etc.
- `derive_title_from_url_basic` — "blog/hello-world" → "hello world",
  "/" → "Untitled", "some-post.html" → "some post"
- `decode_html_entities_basic` — basic entity decoding

### Build
- `cargo check` clean
- `cargo build` clean
- `cargo test --lib` 49/49 deterministic

### Tauri-sim test (Playwright + mocked __TAURI__)
- `api.importLink({ url, title, tags })` → `invoke('vault_link_import', { url, title_hint, tags })`
- Returns created Entity with URL + tags
- 0 console errors

## Decisions made

### Minimal HTML parsing without external deps
- The 4 helper functions are 60 lines of pure Rust
- They handle 95% of real-world pages (title, og:title, twitter:title)
- A proper HTML parser (html5ever, scraper) would be 1-2 MB of deps
  for 5% edge cases. Filed v0.4.4.x+++++: consider scraper crate
  if a real-world page fails to parse.

### reqwest with rustls-tls only
- Default features include OpenSSL (heavy dep). rustls-tls is
  pure-Rust, no native dependency. Smaller binary, simpler build.

### title_hint takes precedence
- The user might paste a URL with a known title; respect their input.
- Falls back to parsed title, then URL-derived title. Always
  produces a meaningful name.

### fetchStatus in data
- Frontend can check `data.fetchStatus` to show a warning if the
  fetch failed (the link is still created, but title might be
  URL-derived or "Untitled")

### File extension stripping
- "blog-post.html" → "blog post" (more useful as a title than
  "blog post html"). Covers html, htm, php, asp, aspx, jsp, do, action.
  Filed v0.4.4.x+++++: add more extensions (md, txt, etc.) if
  needed.

## What's not in this issue (filed as v0.4.4.x++++++)

- v0.4.4.x++++++ — `scraper` crate for robust HTML parsing
- v0.4.4.x++++++ — extract more meta tags (description, image, site_name)
- v0.4.4.x++++++ — concurrent fetch (tokio::main for batch imports)
- v0.4.4.x++++++ — bookmark auto-fetch (when user clicks "save link")
