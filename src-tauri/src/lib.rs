// Second Brain OS — Tauri 2.0 desktop shell
// v0.4.4 — adds vault commands so the bundled Tauri app can do vault
// operations without the Node HTTP server.
//
// Commands (all auto-allowed in Tauri 2.0; no capability entry needed):
//   config_get()       → Config JSON (vault_path, directories, port, host)
//   vault_list_all()   → Vec<Entity> — every .md file in the vault
//
// Future commands (filed as v0.4.4.x follow-ups):
//   vault_read(id)     → Entity
//   vault_create(...)
//   vault_update(...)
//   vault_delete(id)
//   config_set(...)
//   vault_search(query)
//   links_import(url)
//
// Security posture (unchanged from v0.4.3):
// - No shell plugin (no arbitrary command execution)
// - No fs plugin (no arbitrary filesystem access from the webview)
// - No http plugin (no arbitrary outbound requests from the webview)
// - Only `core:default` capabilities (window management, app metadata, etc.)
//
// In release mode the webview loads from `../public/` (bundled). All
// vault operations go through the Rust commands below — no Node server.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub vault_path: String,
    #[serde(default)]
    pub port: Option<u16>,
    #[serde(default)]
    pub host: Option<String>,
    #[serde(default)]
    pub directories: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Entity {
    /// id is "type/slug" form (the directory name + filename without .md)
    pub id: String,
    /// entity type: person / task / project / link
    pub r#type: String,
    /// filename without extension and without directory
    pub slug: String,
    /// title from frontmatter, or filename if missing
    pub title: String,
    /// parsed frontmatter as a JSON object
    pub data: serde_json::Value,
    /// markdown body (everything after the closing `---`)
    pub body: String,
    /// absolute filesystem path
    pub path: String,
}

const TYPES: &[&str] = &["person", "task", "project", "link"];

/// Locate config.json. Search order:
/// 1. $SECOND_BRAIN_CONFIG (env override)
/// 2. ./config.json (cwd)
/// 3. $XDG_CONFIG_HOME/second-brain/config.json
/// 4. ~/.config/second-brain/config.json
fn find_config() -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(p) = std::env::var("SECOND_BRAIN_CONFIG") {
        candidates.push(PathBuf::from(p));
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("config.json"));
    }
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        candidates.push(PathBuf::from(xdg).join("second-brain").join("config.json"));
    }
    if let Some(home) = dirs_home() {
        candidates.push(home.join(".config").join("second-brain").join("config.json"));
    }
    for c in candidates {
        if c.exists() {
            // Canonicalize so the returned path is absolute and stable.
            return std::fs::canonicalize(&c).ok().or(Some(c));
        }
    }
    None
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var("HOME").ok().map(PathBuf::from)
}

/// Lenient frontmatter parser:
/// - Returns (parsed_yaml_as_json, body_after_second_dashes)
/// - If the file doesn't start with `---\n`, returns ({}, whole_file)
/// - If there's no closing `---`, returns ({}, whole_file) — salvages
///   gracefully like the JS parser does.
fn parse_frontmatter(raw: &str) -> (serde_json::Value, String) {
    let lines: Vec<&str> = raw.lines().collect();
    if lines.first().map(|s| *s) != Some("---") {
        return (serde_json::json!({}), raw.to_string());
    }
    let end = lines.iter().enumerate().skip(1).find_map(|(i, l)| {
        if *l == "---" { Some(i) } else { None }
    });
    let end = match end {
        Some(i) => i,
        None => return (serde_json::json!({}), raw.to_string()),
    };
    let yaml_text = lines[1..end].join("\n");
    let mut body = lines[end + 1..].join("\n");
    // Preserve a trailing newline if the original had one.
    if raw.ends_with('\n') && !body.ends_with('\n') {
        body.push('\n');
    }
    let data: serde_json::Value =
        serde_yaml::from_str(&yaml_text).unwrap_or_else(|_| serde_json::json!({}));
    (data, body)
}

#[tauri::command]
fn config_get() -> Result<Config, String> {
    let path = find_config().ok_or_else(|| {
        "config.json not found. Set $SECOND_BRAIN_CONFIG or place config.json in cwd / $XDG_CONFIG_HOME/second-brain/".to_string()
    })?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {}", path.display(), e))?;
    serde_json::from_str(&raw)
        .map_err(|e| format!("parse {}: {}", path.display(), e))
}

#[tauri::command]
fn vault_list_all() -> Result<Vec<Entity>, String> {
    let cfg = config_get().map_err(|e| format!("config: {e}"))?;
    let root = PathBuf::from(&cfg.vault_path);
    if !root.exists() {
        return Err(format!("vault path not found: {}", cfg.vault_path));
    }

    let mut entities: Vec<Entity> = Vec::new();
    for t in TYPES {
        // directory name: prefer directories[t], fallback to lowercase plural-ish
        let dir_name = cfg
            .directories
            .get(*t)
            .cloned()
            .unwrap_or_else(|| t.to_string());
        let dir = root.join(&dir_name);
        if !dir.exists() {
            // Silently skip missing dirs — vault may not have every type yet.
            continue;
        }
        for entry in WalkDir::new(&dir)
            .max_depth(1)
            .into_iter()
            .filter_map(Result::ok)
        {
            let p = entry.path();
            if !entry.file_type().is_file() { continue; }
            if p.extension().and_then(|s| s.to_str()) != Some("md") { continue; }
            let raw = match std::fs::read_to_string(p) {
                Ok(s) => s,
                Err(e) => {
                    log::warn!("[vault] failed to read {}: {}", p.display(), e);
                    continue;
                }
            };
            let (data, body) = parse_frontmatter(&raw);
            let slug = p
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let title = data
                .get("title")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| slug.clone());
            entities.push(Entity {
                id: format!("{dir_name}/{slug}"),
                r#type: (*t).to_string(),
                slug,
                title,
                data,
                body,
                path: p.display().to_string(),
            });
        }
    }
    // Sort by updated desc if present, else title asc.
    entities.sort_by(|a, b| {
        let a_upd = a.data.get("updated").and_then(|v| v.as_str()).unwrap_or("");
        let b_upd = b.data.get("updated").and_then(|v| v.as_str()).unwrap_or("");
        b_upd.cmp(a_upd).then_with(|| a.title.cmp(&b.title))
    });
    Ok(entities)
}

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
            log::info!("second-brain v{} starting", env!("CARGO_PKG_VERSION"));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![config_get, vault_list_all])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parse_frontmatter_basic() {
        let raw = "---\ntitle: Hello\ntype: note\ntags:\n  - a\n  - b\n---\nBody line 1\n\nBody line 2\n";
        let (data, body) = parse_frontmatter(raw);
        assert_eq!(data.get("title").and_then(|v| v.as_str()), Some("Hello"));
        assert_eq!(data.get("type").and_then(|v| v.as_str()), Some("note"));
        assert_eq!(body, "Body line 1\n\nBody line 2\n");
    }

    #[test]
    fn parse_frontmatter_missing_returns_body() {
        let raw = "No frontmatter here at all\n";
        let (data, body) = parse_frontmatter(raw);
        assert_eq!(data, serde_json::json!({}));
        assert_eq!(body, raw);
    }

    #[test]
    fn parse_frontmatter_unclosed_returns_body() {
        let raw = "---\ntitle: Half open\nno closing dashes\n";
        let (data, body) = parse_frontmatter(raw);
        assert_eq!(data, serde_json::json!({}));
        assert_eq!(body, raw);
    }

    #[test]
    fn parse_frontmatter_broken_yaml_salvages() {
        // Real-world: user edited the file and the YAML is invalid mid-block.
        // Lenient parser should still return what it can (here: empty object
        // because the YAML can't be parsed at all). Body should still be
        // retrievable — but our minimal parser returns the whole file in that
        // case. That's the same conservative behavior as lib/frontmatter.mjs.
        let raw = "---\ntitle: [broken yaml\n---\nbody\n";
        let (_data, _body) = parse_frontmatter(raw);
        // Just verify it doesn't panic and produces some result.
        assert!(_data.is_object());
    }

    #[test]
    fn find_config_cwd() {
        let dir = tempfile::tempdir().expect("tempdir");
        let p = dir.path().join("config.json");
        let mut f = std::fs::File::create(&p).expect("create");
        f.write_all(b"{}").expect("write");
        let prev = std::env::current_dir().expect("cwd");
        std::env::set_current_dir(dir.path()).expect("chdir");
        let found = find_config();
        std::env::set_current_dir(prev).expect("restore cwd");
        assert_eq!(found, Some(p));
    }

    #[test]
    fn vault_list_all_reads_fixture_vault() {
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        let people = vault.join("10-People");
        let tasks = vault.join("20-Tasks");
        std::fs::create_dir_all(&people).unwrap();
        std::fs::create_dir_all(&tasks).unwrap();

        // Alice — older updated
        std::fs::write(
            people.join("alice.md"),
            "---\ntitle: Alice\ntype: person\nupdated: 2026-07-10T10:00:00Z\n---\nAlice body.\n",
        ).unwrap();
        // Bob — newer updated (should sort first)
        std::fs::write(
            people.join("bob.md"),
            "---\ntitle: Bob\ntype: person\nupdated: 2026-07-12T09:00:00Z\n---\nBob body.\n",
        ).unwrap();
        // A task
        std::fs::write(
            tasks.join("buy-groceries.md"),
            "---\ntitle: Buy groceries\ntype: task\nstatus: open\nupdated: 2026-07-11T08:00:00Z\n---\nMilk.\n",
        ).unwrap();
        // A non-md file (should be ignored)
        std::fs::write(people.join("notes.txt"), "ignore me").unwrap();
        // A md file in vault root (not under a typed dir, should be ignored)
        std::fs::write(vault.join("stray.md"), "---\ntitle: stray\n---\nstray").unwrap();

        let cfg_path = dir.path().join("config.json");
        let cfg_json = format!(
            r#"{{"vault_path":"{}","directories":{{"person":"10-People","task":"20-Tasks"}}}}"#,
            vault.display()
        );
        std::fs::write(&cfg_path, cfg_json).unwrap();

        let prev = std::env::current_dir().expect("cwd");
        std::env::set_current_dir(dir.path()).expect("chdir");
        let result = vault_list_all();
        std::env::set_current_dir(prev).expect("restore cwd");

        let entities = result.expect("vault_list_all ok");
        assert_eq!(entities.len(), 3, "expected 3 entities, got {entities:?}");
        // Sorted by updated desc: Bob (12), Task (11), Alice (10)
        assert_eq!(entities[0].title, "Bob");
        assert_eq!(entities[1].title, "Buy groceries");
        assert_eq!(entities[2].title, "Alice");
        assert_eq!(entities[0].r#type, "person");
        assert_eq!(entities[1].r#type, "task");
        assert!(entities[0].body.contains("Bob body"));
        assert!(entities[0].data.get("title").is_some());
        assert!(entities[0].id.contains("10-People/bob"));
    }

    #[test]
    fn config_get_reads_minimal_config() {
        let dir = tempfile::tempdir().expect("tempdir");
        let cfg_path = dir.path().join("config.json");
        std::fs::write(&cfg_path, r#"{"vault_path":"/tmp/fake"}"#).unwrap();
        let prev = std::env::current_dir().expect("cwd");
        std::env::set_current_dir(dir.path()).expect("chdir");
        let result = config_get();
        std::env::set_current_dir(prev).expect("restore cwd");
        let cfg = result.expect("config_get ok");
        assert_eq!(cfg.vault_path, "/tmp/fake");
        assert!(cfg.port.is_none());
        assert!(cfg.host.is_none());
        assert!(cfg.directories.is_empty());
    }

    #[test]
    fn config_get_missing_returns_error() {
        let dir = tempfile::tempdir().expect("tempdir");
        let prev = std::env::current_dir().expect("cwd");
        std::env::set_current_dir(dir.path()).expect("chdir");
        let result = config_get();
        std::env::set_current_dir(prev).expect("restore cwd");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("config.json not found"), "got: {err}");
    }
}
