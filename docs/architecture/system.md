# System Architecture

> High-level component map. Detailed per-component docs in `frontend.md`, `backend.md`, `database.md`, `agent.md`, `security.md`, `deploy.md`.

## Current (v0.3, web-only)

```
┌─────────────────────────────────────────────────────────────┐
│                   Browser (127.0.0.1:3939)                   │
│                                                              │
│   public/                                                     │
│   ┌─────────┐    ┌─────────────────────────────────────┐    │
│   │ index   │    │                app.js              │    │
│   │ .html   │    │   - hash router                     │    │
│   │ style   │    │   - render functions                │    │
│   │ .css    │    │   - API client (fetch)              │    │
│   │ marked  │    │   - markdown render                 │    │
│   └─────────┘    │   - theme / search / modals          │    │
│                  │   - wikilink autocomplete           │    │
│                  │   - smart mentions                    │    │
│                  │   - kanban DnD                       │    │
│                  │   - tag filter                        │    │
│                  └─────────────────┬────────────────────┘    │
│                                    │ JSON over HTTP          │
└────────────────────────────────────┼────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────┐
│                       Node.js Process                        │
│                                                              │
│   server.mjs (entry)                                         │
│      ↓                                                       │
│   lib/server.mjs                                              │
│      ├─ /api/* REST endpoints                                │
│      ├─ /api/config (get/put)                                │
│      ├─ /api/entities (CRUD)                                 │
│      ├─ /api/search                                          │
│      ├─ /api/dashboard                                       │
│      └─ /api/links/{import,light}                            │
│                                                              │
│   lib/vault.mjs                                               │
│      └─ atomic write, slug, wikilink                         │
│                                                              │
│   lib/frontmatter.mjs                                         │
│      └─ YAML parse/serialize (lenient)                      │
│                                                              │
│   lib/linkfetch.mjs                                           │
│      └─ fetch + jsdom + html→md                              │
│                                                              │
└─────────────────────────┬────────────────────────────────────┘
                          │ fs (atomic)
                          ▼
        ┌─────────────────────────────────────┐
        │   Obsidian Vault (filesystem)         │
        │   10-People/ 20-Tasks/ ...            │
        └─────────────────────────────────────┘
```

## Planned (v0.4, Tauri)

```
┌─────────────────────────────────────────────────────────────┐
│             Tauri Desktop (Linux AppImage / .deb)            │
│                                                              │
│   src-tauri/ (Rust)                                          │
│   ┌─────────────────┐                                       │
│   │  Tauri Shell     │                                       │
│   │  + Tauri Cmd     │◀── vault_list, vault_read, ...        │
│   │  + Capabilities  │                                       │
│   │  + FS (scoped)   │                                       │
│   └────────┬────────┘                                       │
│            │ Tauri IPC                                      │
│   public/  │                                                 │
│   ┌────────▼──────────────────────────────────────┐         │
│   │  WebView (chromium)                            │         │
│   │   - Same v0.3 SPA                              │         │
│   │   - invoke('cmd_name', args) instead of fetch   │         │
│   └────────────────────────────────────────────────┘         │
│                                                              │
│   lib/                                                        │
│   ┌─────────────────────────────────────────────────┐       │
│   │  Node HTTP server (optional, for web showcase)  │       │
│   │  + Tauri commands (always)                      │       │
│   └─────────────────────────────────────────────────┘       │
└─────────────────────────┬────────────────────────────────────┘
                          │ fs
                          ▼
        ┌─────────────────────────────────────┐
        │   Obsidian Vault                     │
        │   + 00-AI/events/ (v0.5+)           │
        │   + 00-Daily/ (v0.5+)               │
        │   + .local/share/second-brain/index.db │
        └─────────────────────────────────────┘
```

## Boundaries

- **WebView ↔ Tauri commands**: only via whitelisted IPC. No shell, no fs escape.
- **WebView ↔ Vault**: only via Tauri commands, not direct file I/O.
- **LLM ↔ anything**: only via the LLM adapter trait, all calls logged.
- **AI ↔ Vault writes**: only via dedicated commands (e.g., `daily_journal_write`).

## Components in Detail

- **Frontend**: see `docs/architecture/frontend.md`
- **Backend (Tauri commands)**: see `docs/architecture/backend.md`
- **Database (SQLite FTS5)**: see `docs/architecture/database.md`
- **Agent (LLM)**: see `docs/architecture/agent.md`
- **Security**: see `docs/architecture/security.md`
- **Deploy**: see `docs/architecture/deploy.md`
