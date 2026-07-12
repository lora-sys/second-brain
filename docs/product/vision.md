# Vision

## The one-sentence promise

**Second Brain OS — your local-first Personal Cognitive Operating System that observes, relates, and reflects, so the system keeps understanding you while you live.**

## Why this exists

Most "second brain" tools are **Personal Knowledge Bases**: I write → it saves.

The next generation is a **Personal Cognitive OS**: it watches my inputs, behaviors, and decisions, and turns them into cognitive assets I can lean on.

Concretely:

- A **PKB** answers "where did I save that note?"
- A **Cognitive OS** answers "what should I think about this?" and "what did I learn last month?"

The shift: from a **storage layer** to a **thinking partner**.

## The phases

```
V1 (shipped v0.1–v0.3)
   Capture: tasks, projects, people, links
   Local Markdown + Obsidian sync
   Single-user web SPA

V2 (v0.4–v0.5)  ← we are here
   Tauri desktop shell (Linux first)
   Event stream collector
   AI Daily Journal: events → reflection → daily notes
   Local LLM (no cloud by default)

V3 (v0.6)
   Knowledge graph: explicit + inferred relations
   Semantic search
   Backlinks on every detail page

V4 (v0.7–v0.8)
   Reflection Agent: weekly pattern detection
   Decision Journal: explicit + retrospective analysis

V5 (v0.9+)
   Knowledge distillation: your patterns → reusable skills
   Personal Agent: chat with full memory + skills context
```

## What "done" means for V2

V2 is "done" when:

1. The Tauri shell ships a Linux AppImage + .deb that runs the existing web frontend.
2. The app collects at least 3 event sources: file changes in the vault, in-app actions, and OS-level calendar events (where available).
3. The Daily Journal generator runs locally, produces a daily reflection from the event stream, and saves it to the vault under `00-Daily/`.
4. Every AI feature is opt-in, local-first, and shows the user exactly what data is being fed to the model.

## Hard non-goals (V1, V2)

- ❌ Cloud sync (no servers, no accounts, no remote).
- ❌ Telemetry by default.
- ❌ Social / collaboration features.
- ❌ Mobile app (TBD after V2 ships).
- ❌ Replacing Obsidian — we live inside it.
- ❌ Polished auto-written prose that hides the raw event stream.

## User (one person, real persona)

`lora` — uses Obsidian for notes, projects, and a personal task list. Wants:
- One tool that does it all (no jumping between apps)
- Local + private (data on disk, not on someone else's server)
- Helps reflect, not just store
- Has a "feel" — looks and acts like a thoughtfully designed tool, not a generic CRUD app

## Definition of Done for MVP (already met at v0.3)

- [x] Capture 4 entity types: person, task, project, link
- [x] Obsidian Vault as canonical store
- [x] Kanban + list + detail views
- [x] Wikilink autocomplete + smart mentions
- [x] Drag-and-drop status changes
- [x] Tag filtering
- [x] Theme system (light / dark / sepia)
- [x] Mobile responsive
- [x] Runs on `localhost` only, no auth
- [x] E2E tested with Playwright + demo video per release

## Future Definition of Done (V2+)

- [ ] Runs on Linux without `npm install` (Tauri AppImage / .deb)
- [ ] Produces a daily reflection in the vault automatically
- [ ] Shows "this task is related to X project" hints
- [ ] Detects "you've been thinking about Y for 3 weeks — what gives?"
- [ ] LLM runs locally, no API calls
- [ ] Every AI prompt is auditable in the vault (`/00-AI/prompts/`)
