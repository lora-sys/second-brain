// Shared state object (v0.4.6+) — extracted from app.js.
// Attached to window.__state for global access (pre-cockpit bridge
// era). New code should prefer window.__state over a local copy.

(() => {
  'use strict';

  const state = {
    config: null,
    counts: { person: 0, task: 0, project: 0, link: 0 },
    entities: { person: [], task: [], project: [], link: [] },
    tasksByStatus: null,
    dueTasks: null,
    recent: null,
    tags: null,
    current: null,
    theme: localStorage.getItem('sb-theme') || 'light',
    activeTagFilters: new Set(),
    allEntities: [],
    searchResults: [],
    searchActiveIndex: -1,
  };

  window.__state = { state };
})();
