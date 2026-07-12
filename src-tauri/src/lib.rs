// Second Brain OS — Tauri 2.0 desktop shell
// v0.4.3 — minimal init. The actual vault commands (vault_list, vault_read,
// vault_write, vault_delete, config_get, config_set) land in v0.4.4.
//
// Security posture for v0.4.3:
// - No shell plugin (no arbitrary command execution)
// - No fs plugin (no arbitrary filesystem access from the webview)
// - No http plugin (no arbitrary outbound requests from the webview)
// - Only `core:default` capabilities (window management, app metadata, etc.)
//
// The webview loads `../public/index.html` (release) or
// `http://localhost:3939` (dev via the existing Node HTTP server).
// Once v0.4.4 lands, the frontend will migrate from `fetch('/api/...')` to
// `invoke('cmd_name', args)` and the Node server becomes optional in
// desktop context.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
