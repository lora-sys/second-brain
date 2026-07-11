# 架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (127.0.0.1:3939)                    │
│                                                                      │
│   ┌─────────┐    ┌─────────────────────────────────────────────┐    │
│   │ index   │    │                app.js                       │    │
│   │ .html   │    │   - hash router                              │    │
│   │         │    │   - render functions (dashboard / kanban)    │    │
│   │ style   │    │   - API client (fetch)                       │    │
│   │ .css    │    │   - markdown rendering (marked + wikilinks)  │    │
│   │ marked  │    │   - theme / search / modals                  │    │
│   └─────────┘    └─────────────────┬───────────────────────────┘    │
│                                    │                                │
└────────────────────────────────────┼────────────────────────────────┘
                                     │ JSON over HTTP
                                     │ (no CORS, same origin)
                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Node.js Process                              │
│                                                                      │
│   server.mjs (entry)                                                 │
│      ↓                                                               │
│   lib/server.mjs  ← HTTP routing, static files                      │
│      ├─ handleListAll / Read / Create / Update / Delete              │
│      ├─ handleSearch                                                 │
│      ├─ handleDashboard                                              │
│      ├─ handleImportLink  ──►  lib/linkfetch.mjs                     │
│      │                            ├─ fetchLight (OG meta)            │
│      │                            ├─ fetchDeep  (HTML → MD via jsdom)│
│      │                            └─ HTML to Markdown converter      │
│      └─ handleLightFetch                                             │
│                                                                      │
│   lib/vault.mjs  ← file I/O                                          │
│      ├─ read / write / delete .md files                              │
│      ├─ frontmatter parse / stringify                                │
│      ├─ lib/frontmatter.mjs  (with lenient YAML parser)             │
│      ├─ slugify / uniqueSlug                                         │
│      └─ wikilink extract / resolve                                    │
│                                                                      │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ fs.readFile / fs.writeFile (atomic)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Obsidian Vault (filesystem)                       │
│                                                                      │
│   10-People/   ← .md files                                           │
│   20-Tasks/    ← .md files                                           │
│   30-Projects/ ← .md files                                           │
│   40-Links/    ← .md files                                           │
│                                                                      │
│   Obsidian reads them. Web reads/writes them. Git can version them.  │
└──────────────────────────────────────────────────────────────────────┘
```

## 数据流向

```
                 ┌─────────────────┐
   Web form ───►│  API endpoint   │──► lib/vault.write ──► atomic rename ──► file on disk
                 └─────────────────┘                                          │
                                                                              ▼
                                                                         Obsidian sees the new file
                                                                              │
   Obsidian edits  ───────────────────────────────────────────────────────────┘
   a .md file
        │
        ▼
   Web refresh  ──►  GET /api/entities/:id  ──►  lib/vault.read  ──►  parsed data + body
```

## 为什么这样设计

### 1. Obsidian 是 source of truth

文件存放在 Obsidian Vault 里，Obsidian 看到的是真实的 `.md` 文件。
网页只是一个有更好输入和呈现的视图。这避免了：

- 双写冲突（用户在 Obsidian 和网页同时编辑时谁赢？）
- 数据丢失（如果网页宕机，Vault 还在）
- 锁定（你永远可以在 Obsidian 里手动修复任何东西）

### 2. 单文件服务 / 单文件前端

`server.mjs` ~1500 行，`app.js` ~1700 行。
无 webpack / vite / react / vue。
新人 5 分钟看懂，改起来 5 分钟。

依赖只有 3 个：

- `js-yaml` — frontmatter 序列化
- `jsdom` — HTML 解析（链接抓取）
- `marked` — Markdown → HTML

### 3. 容错的 frontmatter 解析

用户会在 Obsidian 里编辑文件。可能会写出这样的 frontmatter：

```markdown
---
title: 测试
notes: |
  这是多行
  包含换行的字段。
---

正文继续
```

或者不规范的：

```markdown
---
title: 测试
notes: 这是描述

**意外留在 frontmatter 里的 markdown**
other: field
---
```

`lib/frontmatter.mjs` 的 `parseYamlLenient` 会尝试解析整个 YAML 块，
失败时退一行再试，最多 20 次。这保证：

- 永远不会因为 frontmatter 问题导致整个文件读不出来
- 用户编辑文件时不至于把数据搞丢
- 解析失败的部分会被放进 body 保留

### 4. 原子写

```js
const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
await fs.writeFile(tmp, text);
await fs.rename(tmp, filePath);
```

写入临时文件然后 rename，避免写到一半崩溃导致文件损坏。

## 配置

`config.json`：

```json
{
  "vaultPath": "/home/lora/文档/Obsidian Vault",
  "port": 3939,
  "host": "127.0.0.1",
  "directories": {
    "person": "10-People",
    "task": "20-Tasks",
    "project": "30-Projects",
    "link": "40-Links",
    "dashboard": "00-Dashboard"
  }
}
```

- `vaultPath`：绝对路径，指向你的 Obsidian Vault 根
- `port`：HTTP 端口，默认 3939
- `host`：默认 `127.0.0.1`（仅本地）。改成 `0.0.0.0` 可在局域网访问，但**强烈不推荐**
- `directories`：每种实体类型的子目录名。可以改成你自己的命名风格

修改后重启生效（除 directories 外，directories 保存即生效）。

## 安全性

- 默认监听 `127.0.0.1`，外部网络无法访问
- 没有用户认证（单用户场景）
- 没有远程代码执行入口
- 所有写入都走文件系统，没用 shell
- 唯一的网络出口是用户主动触发链接抓取时

## 性能

- 列表页每次都重新从磁盘读，没有缓存层（这是故意的：数据始终是最新）
- 单 Vault 1000 个实体以内无感
- 更大时建议：
  - 加内存缓存（`Map<id, entity>`）
  - 全文搜索换成 SQLite FTS5
