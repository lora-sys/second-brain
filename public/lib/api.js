// API object (v0.4.6+) — extracted from app.js into its own module.
// The api object maps SPA actions to either:
// - Tauri invoke() calls (when running in the Tauri webview), or
// - fetch() to the Node HTTP server (when running in a plain browser).
// See public/lib/bridge.js for the invoke-or-fetch logic.

(() => {
  'use strict';

  // bridge.js attaches window.__bridge.{tauri, invokeOrFetch}.
  const { tauri, invokeOrFetch } = window.__bridge;

  const api = {
    async req(path, opts = {}) {
      const res = await fetch(path, {
        headers: { 'content-type': 'application/json' },
        ...opts,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      return data;
    },
    get(path) { return this.req(path); },
    post(path, body) { return this.req(path, { method: 'POST', body: JSON.stringify(body || {}) }); },
    put(path, body) { return this.req(path, { method: 'PUT', body: JSON.stringify(body || {}) }); },
    del(path) { return this.req(path, { method: 'DELETE' }); },
    config: {
      // v0.4.5 — Tauri path: invoke('config_get'). Browser path: fetch.
      get: () => invokeOrFetch('config_get', {}, '/api/config'),
      put: (body) => {
        if (tauri) {
          // config_set takes only the fields that should change; null = unchanged
          return invokeOrFetch('config_set', {
            vaultPath: body && body.vaultPath,
            port: body && body.port,
            host: body && body.host,
            directories: body && body.directories,
          }, '/api/config', { method: 'PUT', body: JSON.stringify(body || {}) });
        }
        return api.put('/api/config', body);
      },
    },
    // v0.4.5 — Tauri path: invoke('vault_list_all'). Browser path: fetch.
    list: (type) => {
      if (tauri && !type) {
        // No filtering on the Rust side yet (would need vault_list_by_type);
        // we use vault_list_all and filter client-side.
        return invokeOrFetch('vault_list_all', {}, '/api/entities').then(d => d.items);
      }
      return api.get(type ? `/api/entities?type=${type}` : '/api/entities').then(d => d.items);
    },
    read: (id) => invokeOrFetch('vault_read', { id }, `/api/entities/${encodeURIComponent(id)}`),
    create: (body) => {
      // Tauri: invoke('vault_create', { entity_type, title, body, data })
      // Browser: POST /api/entities
      if (tauri) {
        return invokeOrFetch(
          'vault_create',
          {
            entity_type: body && body.type,
            title: body && (body.title || body.name),
            body: body && (body.body || ''),
            data: body && body.data,
          },
          '/api/entities',
          { method: 'POST', body: JSON.stringify(body || {}) }
        );
      }
      return api.post('/api/entities', body);
    },
    update: (id, body) => {
      if (tauri) {
        // vault_update(id, {data, body}) — only the fields the caller
        // sends are overwritten; everything else is preserved.
        return invokeOrFetch(
          'vault_update',
          { id, data: body && body.data, body: body && body.body },
          `/api/entities/${encodeURIComponent(id)}`,
          { method: 'PUT', body: JSON.stringify(body || {}) }
        );
      }
      return api.put(`/api/entities/${encodeURIComponent(id)}`, body);
    },
    delete: (id) => {
      if (tauri) {
        return invokeOrFetch(
          'vault_delete',
          { id, trash: false },
          `/api/entities/${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );
      }
      return api.del(`/api/entities/${encodeURIComponent(id)}`);
    },
    search: (q) => invokeOrFetch('vault_search', { query: q, type_filter: null }, `/api/search?q=${encodeURIComponent(q)}`),
    dashboard: () => api.get('/api/dashboard'),
    importLink: (body) => api.post('/api/links/import', body),
  };


  window.__api = { api };
})();
