// Tauri bridge (v0.4.5+) — extracted from app.js in v0.4.6.
// When running inside the Tauri webview, route API calls through
// invoke() so they hit the Rust commands in src-tauri/. When running in
// a plain browser (web showcase), fall back to fetch() against the
// Node HTTP server.

(() => {
  'use strict';

  // Probe Tauri 2.0 and 1.0 invocation shapes.
  const tauri = (() => {
    try {
      if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
        return { kind: 'v2', invoke: window.__TAURI__.core.invoke };
      }
      if (typeof window.__TAURI_INVOKE__ === 'function') {
        return { kind: 'v1', invoke: window.__TAURI_INVOKE__ };
      }
    } catch {}
    return null;
  })();

  // Normalize the shape returned by Rust commands to match what the
  // rest of the SPA expects from the Node HTTP server.
  function normalizeTauri(cmd, data) {
    if (cmd === 'vault_list_all') return { items: data || [] };
    if (cmd === 'vault_list_by_type') return { items: data || [] };
    return data;
  }

  // Bridge: invoke when in Tauri, fall back to fetch in browser.
  // On invoke failure, logs a warning and falls through to fetch.
  async function invokeOrFetch(cmd, args, fetchPath, fetchOpts = {}) {
    if (tauri) {
      try {
        const data = await tauri.invoke(cmd, args || {});
        return normalizeTauri(cmd, data);
      } catch (err) {
        const msg = String((err && err.message) || err);
        console.warn(`[bridge] invoke('${cmd}') failed: ${msg}; falling back to fetch`);
        // Fall through to fetch.
      }
    }
    const res = await fetch(fetchPath, {
      headers: { 'content-type': 'application/json' },
      ...fetchOpts,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  // Public surface: tauri (for inspection) + invokeOrFetch (for the api).
  window.__bridge = { tauri, invokeOrFetch };
})();
