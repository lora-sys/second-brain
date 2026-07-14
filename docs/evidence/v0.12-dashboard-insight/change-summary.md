# v0.12 — Dashboard Latest Reflection Widget · Change Summary

## What changed

The cockpit dashboard (今日) now has a **最新周报** (Latest Reflection) widget. It loads the most recent weekly journal and shows an excerpt of its content inline, with a link to view the full weekly report.

## Implementation

- `lib/server.mjs`
  - `handleWeeklyList` now reads each weekly's body (first 400 chars) and includes it in the response
  - The body's frontmatter is stripped; what's returned is the actual content
- `public/lib/cockpit.js`
  - New `renderLatestReflection()` — async, loads journals via the existing API
  - Empty state: "还没有周报。生成第一篇就能在这里看到摘要。" with link to /weekly
  - Populated state: shows the first 5 non-empty lines from the journal, plus a "看完整周报 →" link
  - Strips the leading `# Title` heading from the body
- `public/style.css`
  - `.block-insight` styling (matches other dashboard blocks)
  - `.cockpit-insight-preview` — pre-formatted monospace excerpt with max-height: 180px, scrollable

## Behavior

After the user has generated at least one weekly journal, the dashboard shows:
- The weekly date as a count badge
- A short excerpt of the journal content (first 5 lines)
- A link to /weekly to see the full journal

The excerpt is plain text (no markdown rendering) — this is intentional for the dashboard preview since rendering markdown in a preview would conflict with the main page layout.

## Verification

### Manual smoke test

The dashboard "今日" panel now shows:
- 今天 / 完成 / 关注 / 右栏 task panels
- 记忆回顾 (recents) — bottom row
- 近期活动 (event stream) — v0.10
- **最新周报** (latest reflection excerpt) — v0.12

For example, with the latest weekly being "2026-07-14":
```
最新周报   2026-07-14
## 本周焦点
过去 1 天有 243 个事件:
- file.changed: 110
- daily.generated: 41
- weekly.generated: 37
[看完整周报 →]
```

### Edge cases

- No weeklies yet → empty state with link to /weekly
- weekly.body empty → still shows the date header and link
- weekly has only frontmatter → empty state because no content lines
- 2+ weeklies → shows the most recent (sorted by filename reverse)

## Tradeoffs

- **Body fetch overhead** — the API now reads each weekly's body file. For 12 weeklies, that's 12 file reads per API call. Acceptable for v0.12.
- **Plain text preview** — no markdown rendering. Could improve with a stripped-down renderer. Filed v0.12.x.
- **No "trends" highlight** — the preview doesn't call out the v0.7 patterns section. Could highlight. Filed v0.12.x.

## Privacy

Pure local computation. The body is read from the vault file at request time. No external API calls.
