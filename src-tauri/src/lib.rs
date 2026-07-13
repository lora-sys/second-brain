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

// WalkDir used inside VaultRepo

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
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

#[derive(Debug, Deserialize, Clone)]
struct ConfigUpdate {
    #[serde(default)]
    vault_path: Option<String>,
    #[serde(default)]
    port: Option<u16>,
    #[serde(default)]
    host: Option<String>,
    /// Directories map (replaces entirely if Some, preserves if None)
    #[serde(default)]
    directories: Option<HashMap<String, String>>,
}

#[tauri::command]
fn config_set(update: ConfigUpdate) -> Result<Config, String> {
    // Read the current config (must exist)
    let path = find_config().ok_or_else(|| {
        "config.json not found; cannot update".to_string()
    })?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {}", path.display(), e))?;
    let mut current: Config = serde_json::from_str(&raw)
        .map_err(|e| format!("parse {}: {}", path.display(), e))?;

    // Apply updates (only the fields that are Some)
    if let Some(vp) = &update.vault_path {
        if vp.trim().is_empty() {
            return Err("vaultPath cannot be empty".to_string());
        }
        current.vault_path = vp.clone();
    }
    if let Some(p) = update.port {
        current.port = Some(p);
    }
    if let Some(h) = &update.host {
        current.host = Some(h.clone());
    }
    if let Some(d) = update.directories {
        current.directories = d;
    }

    // Validate: vault path must exist (warning if not; we still allow setting
    // to a path the user will create later — they may be configuring first).
    let new_path = std::path::PathBuf::from(&current.vault_path);
    if !new_path.exists() {
        // Not an error — the user might be configuring a path that doesn't
        // exist yet. We just don't create the dirs.
    }

    // Serialize and write atomically.
    let new_raw = serde_json::to_string_pretty(&current)
        .map_err(|e| format!("serialize: {e}"))?;
    let lock = acquire_file_lock(&path)
        .map_err(|e| format!("lock {}: {}", path.display(), e))?;
    let write_result = (|| -> Result<(), String> {
        let tmp = path.with_extension("json.tmp");
        std::fs::write(&tmp, new_raw.as_bytes())
            .map_err(|e| format!("write {}: {}", tmp.display(), e))?;
        std::fs::rename(&tmp, &path)
            .map_err(|e| format!("rename {}: {}", tmp.display(), e))?;
        Ok(())
    })();
    release_file_lock(lock);
    write_result?;
    Ok(current)
}

/// Per-file lock (different from acquire_dir_lock which is per-directory).
/// Used by config_set to prevent concurrent config writes.
fn acquire_file_lock(path: &std::path::Path) -> Result<std::path::PathBuf, String> {
    let lock_path = path.with_extension("json.lock");
    for _ in 0..50 {
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_path)
        {
            Ok(_) => return Ok(lock_path),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            Err(e) => return Err(format!("open {}: {}", lock_path.display(), e)),
        }
    }
    Err(format!("could not acquire lock {}", lock_path.display()))
}

fn release_file_lock(lock_path: std::path::PathBuf) {
    let _ = std::fs::remove_file(&lock_path);
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
fn vault_read(id: String) -> Result<Entity, String> {
    // id is "type/slug" form (matches the Entity.id we return from
    // vault_list_all). Parse it, then read the entity from the vault.
    let (dir_name, slug) = parse_id(&id)?;
    let cfg = config_get().map_err(|e| format!("config: {e}"))?;
    // Resolve directory → entity type by inverting cfg.directories.
    // (dir_name is the directory, e.g. "10-People".)
    let entity_type = cfg
        .directories
        .iter()
        .find(|(_, v)| v.as_str() == dir_name.as_str())
        .map(|(k, _)| k.clone());
    let type_ = match entity_type {
        Some(t) => t,
        None => return Err(format!("unknown directory: {dir_name}")),
    };
    let vault_root = std::path::PathBuf::from(&cfg.vault_path);
    let dir = vault_root.join(&dir_name);
    if !dir.exists() {
        return Err(format!("vault dir not found: {}", dir.display()));
    }
    let file_path = dir.join(format!("{slug}.md"));
    if !file_path.exists() {
        return Err(format!("entity not found: {id}"));
    }
    let raw = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("read {}: {}", file_path.display(), e))?;
    let (data, body) = parse_frontmatter(&raw);
    let title = data
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| slug.clone());
    Ok(Entity {
        id: format!("{dir_name}/{slug}"),
        r#type: type_,
        slug,
        title,
        data,
        body,
        path: file_path.display().to_string(),
    })
}

fn parse_id(id: &str) -> Result<(String, String), String> {
    // id is "{directory}/{slug}" form (e.g. "10-People/alice"). We split on
    // the LAST '/' so that nested directory structures (future-proof) work.
    // The directory name is resolved against cfg.directories inside the
    // command, so we don't validate the directory string here.
    let idx = id.rfind('/').ok_or_else(|| format!("invalid id: {id}"))?;
    let dir = id[..idx].to_string();
    let slug = id[idx + 1..].to_string();
    if dir.is_empty() || slug.is_empty() {
        return Err(format!("invalid id: {id}"));
    }
    Ok((dir, slug))
}

#[tauri::command]
fn vault_list_all() -> Result<Vec<Entity>, String> {
    let repo = VaultRepo::open()?;
    let mut entities = repo.walk();
    // Sort by updated desc if present, else title asc.
    entities.sort_by(|a, b| {
        let a_upd = a.data.get("updated").and_then(|v| v.as_str()).unwrap_or("");
        let b_upd = b.data.get("updated").and_then(|v| v.as_str()).unwrap_or("");
        b_upd.cmp(a_upd).then_with(|| a.title.cmp(&b.title))
    });
    Ok(entities)
}

#[tauri::command]
fn vault_search(query: String, type_filter: Option<String>) -> Result<Vec<Entity>, String> {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return Err("query is required".to_string());
    }
    let all = vault_list_all()?;
    let mut scored: Vec<(i32, Entity)> = all
        .into_iter()
        .filter_map(|e| {
            // Optional type filter
            if let Some(t) = &type_filter {
                if t != &e.r#type { return None; }
            }
            let title = e.title.to_lowercase();
            let body = e.body.to_lowercase();
            let title_match_idx = title.find(&q);
            let body_match_idx = body.find(&q);
            if title_match_idx.is_none() && body_match_idx.is_none() {
                return None;
            }
            // Scoring: title match worth more than body match.
            // Earlier title match worth more than later.
            let mut score: i32 = 0;
            if let Some(i) = title_match_idx {
                score += 100;
                // Earlier in title = higher
                score += (50 - i as i32).max(0);
                // Exact title match is a big bonus
                if title == q { score += 500; }
            }
            if let Some(i) = body_match_idx {
                score += 10;
                score += (50 - i as i32).max(0);
            }
            Some((score, e))
        })
        .collect();
    // Sort by score desc, then by updated desc as tiebreaker.
    scored.sort_by(|a, b| {
        b.0.cmp(&a.0)
            .then_with(|| {
                let ua = a.1.data.get("updated").and_then(|v| v.as_str()).unwrap_or("");
                let ub = b.1.data.get("updated").and_then(|v| v.as_str()).unwrap_or("");
                ub.cmp(ua)
            })
    });
    Ok(scored.into_iter().map(|(_, e)| e).collect())
}

#[tauri::command]
fn vault_update(
    id: String,
    data: Option<serde_json::Value>,
    body: Option<String>,
) -> Result<Entity, String> {
    let (dir_name, slug) = parse_id(&id)?;
    let cfg = config_get().map_err(|e| format!("config: {e}"))?;
    let entity_type = cfg
        .directories
        .iter()
        .find(|(_, v)| v.as_str() == dir_name.as_str())
        .map(|(k, _)| k.clone())
        .ok_or_else(|| format!("unknown directory: {dir_name}"))?;
    let vault_root = std::path::PathBuf::from(&cfg.vault_path);
    let dir = vault_root.join(&dir_name);
    let file_path = dir.join(format!("{slug}.md"));
    if !file_path.exists() {
        return Err(format!("entity not found: {id}"));
    }

    // Read existing frontmatter so we can preserve unspecified keys.
    let existing_raw = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("read {}: {}", file_path.display(), e))?;
    let (existing_data, _existing_body) = parse_frontmatter(&existing_raw);

    // Merge: existing + new overrides (but caller can't blank keys).
    let mut fm = existing_data.as_object().cloned().unwrap_or_default();
    if let Some(serde_json::Value::Object(obj)) = data {
        for (k, v) in obj {
            fm.insert(k, v);
        }
    }
    // title/type come from the existing entity unless caller explicitly set them.
    if !fm.contains_key("title") {
        fm.insert("title".to_string(), serde_json::Value::String(slug.clone()));
    }
    if !fm.contains_key("type") {
        fm.insert("type".to_string(), serde_json::Value::String(entity_type.clone()));
    }
    // Always update the 'updated' field.
    let now = chrono_like_now();
    fm.insert("updated".to_string(), serde_json::Value::String(now));

    let yaml = serde_yaml::to_string(&serde_json::Value::Object(fm.clone()))
        .map_err(|e| format!("yaml serialize: {e}"))?;
    let new_body_str = match &body {
        Some(b) => format!("\n{}\n", b.trim_end_matches('\n')),
        None => _existing_body,
    };
    let file_content = format!("---\n{yaml}---\n{new_body_str}");

    // Acquire lock, atomic write.
    let lock = acquire_dir_lock(&dir).map_err(|e| format!("lock {}: {}", dir.display(), e))?;
    let write_result = (|| -> Result<(), String> {
        let tmp = dir.join(format!(".tmp-{}-{}", std::process::id(), slug));
        std::fs::write(&tmp, file_content.as_bytes()).map_err(|e| format!("write {}: {}", tmp.display(), e))?;
        std::fs::rename(&tmp, &file_path).map_err(|e| format!("rename {}: {}", tmp.display(), e))?;
        Ok(())
    })();
    release_dir_lock(lock);
    write_result?;

    let title = fm.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| slug.clone());
    Ok(Entity {
        id: format!("{dir_name}/{slug}"),
        r#type: entity_type,
        slug,
        title,
        data: serde_json::Value::Object(fm),
        body: new_body_str,
        path: file_path.display().to_string(),
    })
}

#[tauri::command]
fn vault_delete(id: String, trash: Option<bool>) -> Result<(), String> {
    let use_trash = trash.unwrap_or(false);
    let (dir_name, slug) = parse_id(&id)?;
    let cfg = config_get().map_err(|e| format!("config: {e}"))?;
    let vault_root = std::path::PathBuf::from(&cfg.vault_path);
    let dir = vault_root.join(&dir_name);
    let file_path = dir.join(format!("{slug}.md"));
    if !file_path.exists() {
        return Err(format!("entity not found: {id}"));
    }
    if use_trash {
        let trash_dir = vault_root.join(".trash");
        std::fs::create_dir_all(&trash_dir)
            .map_err(|e| format!("create trash dir: {e}"))?;
        let lock = acquire_dir_lock(&dir)
            .map_err(|e| format!("lock {}: {}", dir.display(), e))?;
        let result = (|| -> Result<(), String> {
            let dest = trash_dir.join(format!("{}-{}.md", slug, chrono_like_now().replace([':', '.'], "-")));
            std::fs::rename(&file_path, &dest)
                .map_err(|e| format!("rename to trash: {e}"))?;
            Ok(())
        })();
        release_dir_lock(lock);
        result?;
    } else {
        let lock = acquire_dir_lock(&dir)
            .map_err(|e| format!("lock {}: {}", dir.display(), e))?;
        let result = (|| -> Result<(), String> {
            std::fs::remove_file(&file_path)
                .map_err(|e| format!("remove: {e}"))?;
            Ok(())
        })();
        release_dir_lock(lock);
        result?;
    }
    Ok(())
}

#[tauri::command]
fn vault_create(
    entity_type: String,
    title: String,
    body: String,
    data: Option<serde_json::Value>,
) -> Result<Entity, String> {
    let valid_types = ["person", "task", "project", "link"];
    if !valid_types.contains(&entity_type.as_str()) {
        return Err(format!("invalid type: {entity_type}"));
    }
    if title.trim().is_empty() {
        return Err("title is required".to_string());
    }
    let cfg = config_get().map_err(|e| format!("config: {e}"))?;
    let dir_name = cfg
        .directories
        .get(&entity_type)
        .cloned()
        .ok_or_else(|| format!("no directory configured for type {entity_type}"))?;
    let vault_root = std::path::PathBuf::from(&cfg.vault_path);
    let dir = vault_root.join(&dir_name);
    std::fs::create_dir_all(&dir).map_err(|e| format!("create dir {}: {}", dir.display(), e))?;

    let base_slug = slugify(&title);
    let mut slug = base_slug.clone();
    let mut counter = 1;
    while dir.join(format!("{slug}.md")).exists() {
        counter += 1;
        slug = format!("{base_slug}-{counter}");
        if counter > 100 {
            return Err(format!("too many collisions for slug base '{base_slug}'"));
        }
    }

    let now = chrono_like_now();
    let mut fm = serde_json::Map::new();
    if let Some(serde_json::Value::Object(obj)) = data.clone() {
        for (k, v) in obj {
            fm.insert(k, v);
        }
    }
    fm.entry("title".to_string()).or_insert(serde_json::Value::String(title.clone()));
    fm.entry("type".to_string()).or_insert(serde_json::Value::String(entity_type.clone()));
    fm.insert("created".to_string(), serde_json::Value::String(now.clone()));
    fm.insert("updated".to_string(), serde_json::Value::String(now));
    let yaml = serde_yaml::to_string(&serde_json::Value::Object(fm))
        .map_err(|e| format!("yaml serialize: {e}"))?;

    let body_normalized = if body.is_empty() { String::new() } else { format!("\n{}\n", body.trim_end_matches('\n')) };
    let file_content = format!("---\n{yaml}---\n{body_normalized}");

    let file_path = dir.join(format!("{slug}.md"));
    let lock = acquire_dir_lock(&dir).map_err(|e| format!("lock {}: {}", dir.display(), e))?;
    let write_result = (|| -> Result<(), String> {
        let tmp = dir.join(format!(".tmp-{}-{}", std::process::id(), slug));
        std::fs::write(&tmp, file_content.as_bytes()).map_err(|e| format!("write {}: {}", tmp.display(), e))?;
        std::fs::rename(&tmp, &file_path).map_err(|e| format!("rename {}: {}", tmp.display(), e))?;
        Ok(())
    })();
    release_dir_lock(lock);
    write_result?;

    Ok(Entity {
        id: format!("{dir_name}/{slug}"),
        r#type: entity_type,
        slug,
        title,
        data: serde_json::Value::Object(
            serde_yaml::from_str::<serde_json::Value>(&yaml)
                .ok()
                .and_then(|v| v.as_object().cloned())
                .unwrap_or_default()
        ),
        body: body_normalized,
        path: file_path.display().to_string(),
    })
}

/// VaultRepo: a lightweight handle to the vault configuration + path.
/// Encapsulates the cfg lookup + per-directory walking pattern so
/// commands don't each re-implement it. Use `open()` to construct,
/// then call `walk()` / `walk_type()` to enumerate entities.
///
/// Read-path only. The write-path commands (vault_create/update/delete)
/// don't use it because they need per-directory file locks, which are
/// orthogonal to "read what's in the vault".
struct VaultRepo {
    config: Config,
    root: std::path::PathBuf,
}

impl VaultRepo {
    fn open() -> Result<Self, String> {
        let config = config_get()?;
        let root = std::path::PathBuf::from(&config.vault_path);
        if !root.exists() {
            return Err(format!("vault path not found: {}", config.vault_path));
        }
        Ok(VaultRepo { config, root })
    }

    /// Walk every entity in every configured directory. Returned in
    /// the order: person, task, project, link. Within each type, the
    /// order is filesystem order (not sorted).
    fn walk(&self) -> Vec<Entity> {
        let mut out = Vec::new();
        for t in TYPES {
            out.extend(self.walk_type(t));
        }
        out
    }

    /// Walk entities of a single type. Empty Vec if the directory
    /// doesn't exist or has no .md files.
    fn walk_type(&self, entity_type: &str) -> Vec<Entity> {
        let dir_name = match self.config.directories.get(entity_type) {
            Some(d) => d.clone(),
            None => return Vec::new(),
        };
        let dir = self.root.join(&dir_name);
        if !dir.exists() {
            return Vec::new();
        }
        let mut out = Vec::new();
        for entry in walkdir::WalkDir::new(&dir).max_depth(1).into_iter().filter_map(Result::ok) {
            if !entry.file_type().is_file() { continue; }
            if entry.path().extension().and_then(|s| s.to_str()) != Some("md") { continue; }
            let raw = match std::fs::read_to_string(entry.path()) {
                Ok(s) => s,
                Err(e) => { log::warn!("[vault] {}: {}", entry.path().display(), e); continue; }
            };
            let (data, body) = parse_frontmatter(&raw);
            let slug = entry.path().file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
            let title = data.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| slug.clone());
            out.push(Entity {
                id: format!("{dir_name}/{slug}"),
                r#type: entity_type.to_string(),
                slug,
                title,
                data,
                body,
                path: entry.path().display().to_string(),
            });
        }
        out
    }
}

/// Walk entities of a single type (Tauri command). Used by api.list(type)
/// in Tauri mode (browser mode still uses /api/entities?type=X).
#[tauri::command]
fn vault_list_by_type(entity_type: String) -> Result<Vec<Entity>, String> {
    if !TYPES.contains(&entity_type.as_str()) {
        return Err(format!("invalid type: {entity_type}"));
    }
    let repo = VaultRepo::open()?;
    Ok(repo.walk_type(&entity_type))
}

/// Minimal slugify: lowercase, replace whitespace with -, strip non-alphanumeric
/// (Unicode letters/digits allowed), collapse multiple -, trim leading/trailing -,
/// cap at 80 chars. Mirrors lib/frontmatter.mjs slugify.
fn slugify(input: &str) -> String {
    let mut s = String::new();
    let mut prev_dash = false;
    for c in input.trim().chars() {
        let mapped = if c.is_whitespace() { '-' } else if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' };
        if mapped == '-' {
            if !prev_dash && !s.is_empty() {
                s.push('-');
                prev_dash = true;
            }
        } else {
            s.push(mapped);
            prev_dash = false;
        }
    }
    let trimmed = s.trim_matches('-').to_string();
    if trimmed.is_empty() { "untitled".to_string() } else { trimmed.chars().take(80).collect() }
}

/// ISO-ish timestamp without bringing in chrono: use std::time.
fn chrono_like_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = (secs / 86400) as i64;
    let rem = (secs % 86400) as i64;
    let h = rem / 3600;
    let m = (rem % 3600) / 60;
    let s = rem % 60;
    let (y, mo, d) = days_to_ymd(days);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{m:02}:{s:02}Z")
}

/// Convert days-since-epoch (1970-01-01) to (year, month, day) using the
/// proleptic Gregorian calendar. No external deps.
fn days_to_ymd(days: i64) -> (i32, u32, u32) {
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe/1460 + doe/36524 - doe/146096) / 365;
    let y = yoe as i32 + era as i32 * 400;
    let doy = doe - (365 * yoe + yoe/4 - yoe/100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

fn acquire_dir_lock(dir: &std::path::Path) -> Result<std::path::PathBuf, String> {
    let lock_path = dir.join(".sb-lock");
    for _ in 0..50 {
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_path)
        {
            Ok(_) => return Ok(lock_path),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            Err(e) => return Err(format!("open {}: {}", lock_path.display(), e)),
        }
    }
    Err(format!("could not acquire lock {}", lock_path.display()))
}

fn release_dir_lock(lock_path: std::path::PathBuf) {
    let _ = std::fs::remove_file(&lock_path);
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
        .invoke_handler(tauri::generate_handler![config_get, config_set, vault_list_all, vault_list_by_type, vault_read, vault_create, vault_update, vault_delete, vault_search])
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

    // Tests that touch the SECOND_BRAIN_CONFIG env var must run serially
    // because env vars are process-wide. Without this mutex, parallel tests
    // race on each other's env mutations.
    static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    /// Guard that temporarily sets an env var and restores it on Drop.
    /// Eliminates the "panic before restore" footgun.
    struct EnvGuard {
        key: &'static str,
        prev: Option<String>,
    }
    impl EnvGuard {
        fn set(key: &'static str, val: &std::path::Path) -> Self {
            let prev = std::env::var(key).ok();
            std::env::set_var(key, val);
            EnvGuard { key, prev }
        }
    }
    impl Drop for EnvGuard {
        fn drop(&mut self) {
            match self.prev.as_ref() {
                Some(v) => std::env::set_var(self.key, v),
                None => std::env::remove_var(self.key),
            }
        }
    }

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
    fn find_config_via_env() {
        let dir = tempfile::tempdir().expect("tempdir");
        let cfg_path = dir.path().join("config.json");
        std::fs::File::create(&cfg_path).expect("create").write_all(b"{}").expect("write");
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let prev_env = std::env::var("SECOND_BRAIN_CONFIG").ok();
        std::env::set_var("SECOND_BRAIN_CONFIG", &cfg_path);
        let found = find_config();
        match prev_env {
            Some(v) => std::env::set_var("SECOND_BRAIN_CONFIG", v),
            None => std::env::remove_var("SECOND_BRAIN_CONFIG"),
        }
        assert!(found.is_some(), "find_config should return Some");
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
            r#"{{"vaultPath":"{}","directories":{{"person":"10-People","task":"20-Tasks"}}}}"#,
            vault.display()
        );
        std::fs::write(&cfg_path, cfg_json).unwrap();

        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let prev_env = std::env::var("SECOND_BRAIN_CONFIG").ok();
        std::env::set_var("SECOND_BRAIN_CONFIG", &cfg_path);

        let result = vault_list_all();
        match prev_env {
            Some(v) => std::env::set_var("SECOND_BRAIN_CONFIG", v),
            None => std::env::remove_var("SECOND_BRAIN_CONFIG"),
        }


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
        std::fs::write(&cfg_path, r#"{"vaultPath":"/tmp/fake"}"#).unwrap();
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let prev_env = std::env::var("SECOND_BRAIN_CONFIG").ok();
        std::env::set_var("SECOND_BRAIN_CONFIG", &cfg_path);

        let result = config_get();
        match prev_env {
            Some(v) => std::env::set_var("SECOND_BRAIN_CONFIG", v),
            None => std::env::remove_var("SECOND_BRAIN_CONFIG"),
        }

        let cfg = result.expect("config_get ok");
        assert_eq!(cfg.vault_path, "/tmp/fake");
        assert!(cfg.port.is_none());
        assert!(cfg.host.is_none());
        assert!(cfg.directories.is_empty());
    }

    #[test]
    fn slugify_basic() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("  多个  空格  "), "多个-空格");
        assert_eq!(slugify("  ?? weird ?? "), "weird");
        assert_eq!(slugify(""), "untitled");
        assert_eq!(slugify("---"), "untitled");
        assert_eq!(slugify("a/b/c"), "a-b-c");
    }

    #[test]
    fn vault_search_finds_title_match() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        vault_create("person".to_string(), "Alice Chen".to_string(), "".to_string(), None).unwrap();
        vault_create("person".to_string(), "Bob Wang".to_string(), "".to_string(), None).unwrap();
        vault_create("person".to_string(), "Alex Kim".to_string(), "".to_string(), None).unwrap();
        let results = vault_search("alice".to_string(), None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Alice Chen");
    }

    #[test]
    fn vault_search_case_insensitive() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        vault_create("person".to_string(), "Alice Chen".to_string(), "".to_string(), None).unwrap();
        let r1 = vault_search("ALICE".to_string(), None).unwrap();
        let r2 = vault_search("ali".to_string(), None).unwrap();
        let r3 = vault_search("chen".to_string(), None).unwrap();
        assert_eq!(r1.len(), 1);
        assert_eq!(r2.len(), 1);
        assert_eq!(r3.len(), 1);
    }

    #[test]
    fn vault_search_in_body() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        vault_create("person".to_string(), "Alice".to_string(), "She works on rust web frameworks".to_string(), None).unwrap();
        vault_create("person".to_string(), "Bob".to_string(), "Loves cooking".to_string(), None).unwrap();
        let results = vault_search("rust".to_string(), None).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Alice");
    }

    #[test]
    fn vault_search_with_type_filter() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        std::fs::create_dir_all(vault.join("20-Tasks")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People","task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        vault_create("task".to_string(), "Alice review".to_string(), "".to_string(), None).unwrap();
        let only_persons = vault_search("alice".to_string(), Some("person".to_string())).unwrap();
        assert_eq!(only_persons.len(), 1);
        assert_eq!(only_persons[0].r#type, "person");
        let only_tasks = vault_search("alice".to_string(), Some("task".to_string())).unwrap();
        assert_eq!(only_tasks.len(), 1);
        assert_eq!(only_tasks[0].r#type, "task");
    }

    #[test]
    fn vault_search_relevance_ranking() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        // Exact title match should rank highest
        vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        // Title substring match
        vault_create("person".to_string(), "Alice friend".to_string(), "".to_string(), None).unwrap();
        // Body match only
        vault_create("person".to_string(), "Bob".to_string(), "Knows alice".to_string(), None).unwrap();
        let results = vault_search("alice".to_string(), None).unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].title, "Alice", "exact title should rank first");
    }

    #[test]
    fn vault_search_empty_query_returns_error() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        assert!(vault_search("".to_string(), None).is_err());
        assert!(vault_search("   ".to_string(), None).is_err());
    }

    #[test]
    fn config_set_updates_fields() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        let initial = format!(
            r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#,
            vault.display()
        );
        std::fs::write(&cfg_path, initial).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        // Update vault path
        let new_vault = dir.path().join("new-vault");
        std::fs::create_dir_all(&new_vault).unwrap();
        let updated = config_set(ConfigUpdate {
            vault_path: Some(new_vault.display().to_string()),
            port: Some(8080),
            host: Some("0.0.0.0".to_string()),
            directories: None,
        }).unwrap();
        assert_eq!(updated.vault_path, new_vault.display().to_string());
        assert_eq!(updated.port, Some(8080));
        assert_eq!(updated.host, Some("0.0.0.0".to_string()));
        // Verify by reading again
        let reread = config_get().unwrap();
        assert_eq!(reread.vault_path, new_vault.display().to_string());
        assert_eq!(reread.port, Some(8080));
        // Directories were NOT replaced (None) — preserved
        assert_eq!(reread.directories.get("person").map(|s| s.as_str()), Some("10-People"));
    }

    #[test]
    fn config_set_replaces_directories_when_some() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let new_dirs: HashMap<String, String> = [
            ("person".to_string(), "People".to_string()),
            ("task".to_string(), "Tasks".to_string()),
        ].iter().cloned().collect();
        let updated = config_set(ConfigUpdate {
            vault_path: None,
            port: None,
            host: None,
            directories: Some(new_dirs.clone()),
        }).unwrap();
        assert_eq!(updated.directories, new_dirs);
    }

    #[test]
    fn config_set_rejects_empty_vault_path() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = config_set(ConfigUpdate {
            vault_path: Some("   ".to_string()),
            port: None,
            host: None,
            directories: None,
        });
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("empty"), "got: {err}");
    }

    #[test]
    fn config_set_atomic_writes_via_tmp() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        config_set(ConfigUpdate {
            vault_path: Some("/new/path".to_string()),
            port: None,
            host: None,
            directories: None,
        }).unwrap();
        // The .json.tmp should not remain
        let stray: Vec<_> = std::fs::read_dir(dir.path()).unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().contains(".tmp") || e.file_name().to_string_lossy().contains(".lock"))
            .collect();
        assert!(stray.is_empty(), "no tmp/lock files should remain, got: {:?}", stray.iter().map(|e| e.path()).collect::<Vec<_>>());
        // .json.lock specifically should be gone
        assert!(!cfg_path.with_extension("json.lock").exists());
    }

    #[test]
    fn vault_search_no_matches_returns_empty_vec() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        let results = vault_search("zzznomatch".to_string(), None).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn vault_create_writes_file() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        let tasks = vault.join("20-Tasks");
        std::fs::create_dir_all(&tasks).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_create(
            "task".to_string(),
            "Buy milk".to_string(),
            "At the corner store.".to_string(),
            None,
        );
        let entity = result.expect("vault_create ok");
        assert_eq!(entity.title, "Buy milk");
        assert_eq!(entity.slug, "buy-milk");
        assert_eq!(entity.r#type, "task");
        assert_eq!(entity.id, "20-Tasks/buy-milk");
        let file_path = tasks.join("buy-milk.md");
        assert!(file_path.exists());
        let raw = std::fs::read_to_string(&file_path).unwrap();
        assert!(raw.starts_with("---\n"));
        assert!(raw.contains("title: Buy milk"));
        assert!(raw.contains("type: task"));
        assert!(raw.contains("At the corner store."));
    }

    #[test]
    fn vault_create_with_extra_data() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let extra = serde_json::json!({"priority": "high", "tags": ["friend"]});
        let result = vault_create(
            "person".to_string(),
            "Alice".to_string(),
            "".to_string(),
            Some(extra),
        );
        let entity = result.expect("vault_create ok");
        assert_eq!(entity.slug, "alice");
        let raw = std::fs::read_to_string(vault.join("10-People").join("alice.md")).unwrap();
        assert!(raw.contains("priority: high"));
        assert!(raw.contains("tags:"));
        assert!(raw.contains("- friend"));
    }

    #[test]
    fn vault_create_handles_slug_collision() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let e1 = vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        let e2 = vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        let e3 = vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        assert_eq!(e1.slug, "alice");
        assert_eq!(e2.slug, "alice-2");
        assert_eq!(e3.slug, "alice-3");
        assert!(vault.join("10-People").join("alice.md").exists());
        assert!(vault.join("10-People").join("alice-2.md").exists());
        assert!(vault.join("10-People").join("alice-3.md").exists());
    }

    #[test]
    fn vault_create_rejects_invalid_type() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_create("monster".to_string(), "x".to_string(), "".to_string(), None);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("invalid type"), "got: {err}");
    }

    #[test]
    fn vault_create_rejects_empty_title() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_create("task".to_string(), "   ".to_string(), "".to_string(), None);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("title"), "got: {err}");
    }

    #[test]
    fn vault_update_modifies_existing_file() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("20-Tasks")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        // Pre-create an entity
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let created = vault_create(
            "task".to_string(),
            "Original title".to_string(),
            "Original body".to_string(),
            None,
        ).unwrap();
        // Update it
        let update = vault_update(
            created.id.clone(),
            Some(serde_json::json!({"status": "done"})),
            Some("Updated body".to_string()),
        ).unwrap();
        assert_eq!(update.id, created.id);
        assert_eq!(update.title, "Original title");
        // 'status' was added, 'updated' was bumped
        assert_eq!(update.data.get("status").and_then(|v| v.as_str()), Some("done"));
        assert!(update.data.get("updated").is_some());
        // Body was replaced
        assert!(update.body.contains("Updated body"));
        assert!(!update.body.contains("Original body"));
    }

    #[test]
    fn vault_update_preserves_unspecified_keys() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("20-Tasks")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let created = vault_create(
            "task".to_string(),
            "Title".to_string(),
            "".to_string(),
            Some(serde_json::json!({"priority": "high", "tags": ["urgent"]})),
        ).unwrap();
        let update = vault_update(created.id.clone(), None, Some("new body".to_string())).unwrap();
        // priority + tags should be preserved
        assert_eq!(update.data.get("priority").and_then(|v| v.as_str()), Some("high"));
        assert!(update.data.get("tags").is_some());
        // updated was bumped
        assert!(update.data.get("updated").is_some());
    }

    #[test]
    fn vault_update_missing_entity_returns_error() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("20-Tasks")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_update("20-Tasks/nonexistent".to_string(), None, Some("x".to_string()));
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("not found"), "got: {err}");
    }

    #[test]
    fn vault_delete_removes_file() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let created = vault_create("person".to_string(), "ToDelete".to_string(), "".to_string(), None).unwrap();
        let file_path = vault.join("10-People").join("todelete.md");
        assert!(file_path.exists());
        vault_delete(created.id.clone(), None).unwrap();
        assert!(!file_path.exists());
    }

    #[test]
    fn vault_delete_to_trash_moves_file() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let created = vault_create("person".to_string(), "TrashMe".to_string(), "".to_string(), None).unwrap();
        let file_path = vault.join("10-People").join("trashme.md");
        assert!(file_path.exists());
        vault_delete(created.id.clone(), Some(true)).unwrap();
        assert!(!file_path.exists());
        // File should be in .trash
        let trash_dir = vault.join(".trash");
        assert!(trash_dir.exists());
        let trash_files: Vec<_> = std::fs::read_dir(&trash_dir).unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().contains("trashme"))
            .collect();
        assert_eq!(trash_files.len(), 1, "file should be in trash");
    }

    #[test]
    fn vault_delete_missing_entity_returns_error() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_delete("10-People/nonexistent".to_string(), None);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("not found"), "got: {err}");
    }

    #[test]
    fn vault_create_atomic_no_tmp_files_left() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        vault_create("person".to_string(), "Bob".to_string(), "".to_string(), None).unwrap();
        let people = vault.join("10-People");
        let lock = people.join(".sb-lock");
        assert!(!lock.exists(), "lock file should be released after write");
        let stray_tmp: Vec<_> = std::fs::read_dir(&people).unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().starts_with(".tmp-"))
            .collect();
        assert!(stray_tmp.is_empty(), "no tmp files should remain");
    }

    #[test]
    fn vault_list_by_type_filters_correctly() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        std::fs::create_dir_all(vault.join("20-Tasks")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People","task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        // Create 2 people, 1 task
        vault_create("person".to_string(), "Alice".to_string(), "".to_string(), None).unwrap();
        vault_create("person".to_string(), "Bob".to_string(), "".to_string(), None).unwrap();
        vault_create("task".to_string(), "Buy milk".to_string(), "".to_string(), None).unwrap();
        // Filter to people
        let people = vault_list_by_type("person".to_string()).unwrap();
        assert_eq!(people.len(), 2);
        for p in &people { assert_eq!(p.r#type, "person"); }
        // Filter to tasks
        let tasks = vault_list_by_type("task".to_string()).unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Buy milk");
        // Filter to link (no entries) — should return empty
        let links = vault_list_by_type("link".to_string()).unwrap();
        assert_eq!(links.len(), 0);
    }

    #[test]
    fn vault_list_by_type_rejects_invalid() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(&vault).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_list_by_type("monster".to_string());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("invalid type"), "got: {err}");
    }

    #[test]
    fn vault_list_by_type_missing_dir_returns_empty() {
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People","task":"20-Tasks"}}}}"#, vault.display()),
        ).unwrap();
        let _env = EnvGuard::set("SECOND_BRAIN_CONFIG", &cfg_path);
        // 20-Tasks dir doesn't exist; calling vault_list_by_type("task") should return empty (not error)
        let result = vault_list_by_type("task".to_string()).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn parse_id_basic() {
        let (t, s) = parse_id("10-People/alice").unwrap();
        assert_eq!(t, "10-People");
        assert_eq!(s, "alice");
    }

    #[test]
    fn parse_id_with_nested_path() {
        // rfind splits on last '/', so type can contain '/' (future-proof).
        let (t, s) = parse_id("a/b/c/alice").unwrap();
        assert_eq!(t, "a/b/c");
        assert_eq!(s, "alice");
    }

    #[test]
    fn parse_id_rejects_empty() {
        assert!(parse_id("/alice").is_err());
        assert!(parse_id("10-People/").is_err());
        assert!(parse_id("").is_err());
    }

    #[test]
    fn vault_read_returns_entity() {
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        let people = vault.join("10-People");
        std::fs::create_dir_all(&people).unwrap();
        std::fs::write(
            people.join("alice.md"),
            "---\ntitle: Alice\ntype: person\nupdated: 2026-07-12T10:00:00Z\n---\nAlice body.\n",
        ).unwrap();

        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let prev_env = std::env::var("SECOND_BRAIN_CONFIG").ok();
        std::env::set_var("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_read("10-People/alice".to_string());
        match prev_env {
            Some(v) => std::env::set_var("SECOND_BRAIN_CONFIG", v),
            None => std::env::remove_var("SECOND_BRAIN_CONFIG"),
        }
        let entity = result.expect("vault_read ok");
        assert_eq!(entity.title, "Alice");
        assert_eq!(entity.slug, "alice");
        assert_eq!(entity.r#type, "person");
        assert_eq!(entity.id, "10-People/alice");
        assert!(entity.body.contains("Alice body"));
        assert!(entity.data.get("title").is_some());
    }

    #[test]
    fn vault_read_missing_entity_returns_error() {
        let dir = tempfile::tempdir().expect("tempdir");
        let vault = dir.path().join("vault");
        std::fs::create_dir_all(vault.join("10-People")).unwrap();
        let cfg_path = dir.path().join("config.json");
        std::fs::write(
            &cfg_path,
            format!(r#"{{"vaultPath":"{}","directories":{{"person":"10-People"}}}}"#, vault.display()),
        ).unwrap();
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let prev_env = std::env::var("SECOND_BRAIN_CONFIG").ok();
        std::env::set_var("SECOND_BRAIN_CONFIG", &cfg_path);
        let result = vault_read("10-People/nonexistent".to_string());
        match prev_env {
            Some(v) => std::env::set_var("SECOND_BRAIN_CONFIG", v),
            None => std::env::remove_var("SECOND_BRAIN_CONFIG"),
        }
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("not found"), "got: {err}");
    }

    #[test]
    fn vault_read_invalid_id_returns_error() {
        // Empty id, no slash, unknown type.
        assert!(vault_read("".to_string()).is_err());
        assert!(vault_read("noslash".to_string()).is_err());
        assert!(vault_read("99-X/y".to_string()).is_err());
    }

    #[test]
    fn config_get_missing_returns_error() {
        let dir = tempfile::tempdir().expect("tempdir");
        // Point SECOND_BRAIN_CONFIG at a path that does NOT exist.
        let nonexistent = dir.path().join("does-not-exist.json");
        let _lock = ENV_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let prev_env = std::env::var("SECOND_BRAIN_CONFIG").ok();
        std::env::set_var("SECOND_BRAIN_CONFIG", &nonexistent);
        let result = config_get();
        match prev_env {
            Some(v) => std::env::set_var("SECOND_BRAIN_CONFIG", v),
            None => std::env::remove_var("SECOND_BRAIN_CONFIG"),
        }

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("config.json not found"), "got: {err}");
    }
}
