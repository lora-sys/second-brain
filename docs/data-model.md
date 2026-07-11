# 数据模型

## 通用约定

- 每个实体 = 一个 `.md` 文件 + YAML frontmatter + Markdown 正文
- 文件名 = `[slug].md`，slug 由 title/name 自动生成
- 目录在 Vault 下，按类型分目录（默认 `10-People/`、`20-Tasks/` 等，可在配置里改）
- frontmatter 第一行必须是 `type: <类型>`
- 时间字段用 ISO 8601：`created`, `updated`, `fetchedAt` 等

## 字段引用语法

正文里可以用 Obsidian 风格的 wikilink：

```markdown
相关：[[30-Projects/second-brain-v1]]          ← 完整路径（类型目录/实体 slug）
联系 [[张三]]                                  ← 模糊匹配（按 slug 或 title 找）
任务：[[20-Tasks/写代码|写代码]]                ← 别名（显示用「写代码」）
```

网页端渲染时把它们变成可点击的紫色胶囊，点了跳转到对应实体。

## 人物 (person)

```yaml
---
type: person
name: 张三                       # 必填
status: active                  # active / dormant / archived
met: 2024-03-15                 # 认识日期（ISO date）
company: Acme                   # 公司 / 团队
role: CTO                       # 角色 / 头衔
contact:                        # 联系方式（可选字段）
  email: zhang@example.com
  phone: ""
  wechat: zhangsan_wx
social:                         # 社交账号（用户名，不要全 URL）
  github: zhangsan
  twitter: zhangsan
  linkedin: zhangsan
  website: https://zhangsan.me
tags:
  - 朋友
  - 技术
created: 2026-07-11T02:56:23.303Z
updated: 2026-07-11T02:56:23.303Z
---

认识于 2018 年，在 [[30-Projects/second-brain-v1]] 项目中再次合作。
```

**字段说明**

- `name`：唯一标识符（slug 由此生成）
- `status`：影响仪表盘统计与筛选
- `met`：显示在卡片上，提醒「多久前认识」
- `contact.*` / `social.*`：自由结构，前端只识别已知字段，其他原样保留
- `tags`：标签云统计

## 任务 (task)

```yaml
---
type: task
title: 完成第二大脑 v1
status: in_progress             # todo / in_progress / done / cancelled
priority: high                  # low / medium / high
due: 2026-07-20                 # 截止日期（ISO date，可选）
project: "[[30-Projects/second-brain-v1]]"   # 所属项目（带 [[]] 的字符串）
tags:
  - 核心
created: 2026-07-11T02:56:23.303Z
updated: 2026-07-11T02:56:23.303Z
---

实现人物/任务/项目/链接四大模块。
```

**状态机**

```
       ┌───► done
todo ──┤
       ├───► in_progress ──► done
       │
       └───► cancelled (任何状态可取消)
```

**字段说明**

- `status`：看板分列依据
- `priority`：卡片左边色条颜色
- `due`：仪表盘「即将到期」按日期升序取前 8
- `project`：字符串里嵌 `[[wikilink]]`，方便 Obsidian 双向链接

## 项目 (project)

```yaml
---
type: project
title: 第二大脑 v1
status: active                  # active / paused / done / archived
description: 个人第二大脑 v1，网页 + Obsidian 仓库
startDate: 2026-07-01           # ISO date
tags:
  - 个人
  - 核心
created: 2026-07-11T02:56:23.303Z
updated: 2026-07-11T02:56:23.303Z
---

## 目标
让 人物 / 任务 / 项目 / 链接 四个模块真正好用。

## 相关
- [[10-People/陈一]]（AI 顾问）
- [[20-Tasks/梳理第二大脑数据模型]]
```

## 链接 (link)

```yaml
---
type: link
title: How to Take Smart Notes
url: https://example.com/smart-notes
site: Sönke Ahrens                # 站点名（自动从 og:site_name 获取）
description: 一本关于 Zettelkasten 与卡片笔记法的入门书
cover: https://example.com/cover.jpg
favicon: https://example.com/favicon.ico
fetchedAt: 2026-07-11T13:26:00.000Z
fetchMode: deep                  # light / deep
fetchStatus: ok                  # ok / failed
fetchError: ""                   # 失败时的错误信息
tags:
  - 阅读
  - 方法论
created: 2026-07-11T13:26:00.000Z
updated: 2026-07-11T13:26:00.000Z
---

# How to Take Smart Notes

Ahrens 在这本书里把 Luhmann 的 Zettelkasten 系统讲得很清楚。
...
```

**字段说明**

- `fetchMode: light` — 只保存元信息（标题、描述、封面、站点名）
- `fetchMode: deep` — 元信息 + 完整正文（HTML → Markdown）
- `fetchStatus: failed` — 抓取失败但链接仍然保存了（用户填了标题和标签就有用）
- 抓取失败的链接在卡片上会显示一个警告标记

## Slug 生成规则

```js
slugify('Hello World!')           // -> 'hello-world'
slugify('学习笔记 / AI')           // -> '学习笔记-ai'
slugify('第二大脑 v1')            // -> '第二大脑-v1'
```

- 保留中文
- 空格 → `-`
- 移除 `/ \ : * ? " < > |`
- 长度上限 80 字符
- 冲突时加 `-2`, `-3` 后缀

## 多设备同步

Vault 是普通文件夹，可以用任何方式同步：

- **Syncthing** — 推荐，点对点，不经过云
- **Git + 私有仓库** — 有完整历史，但 vault 里图片多时仓库会大
- **iCloud Drive / Dropbox / Google Drive** — 简单但有冲突风险
- **Working Copy (iOS) + Working Copy Git** — 在 iPad 上也能跑 Obsidian + Git 同步

## 与 Obsidian 插件的兼容

- **Dataview** — 可以查 frontmatter 字段做表格 / 列表
- **Templater** — 可以基于模板新建文件
- **Graph Analysis** — wikilink 会被识别成图节点
- **Tasks** — 任务的 due / status 字段符合其规范

示例 Dataview 查询（在 Obsidian 里）：

```dataview
LIST
FROM "20-Tasks"
WHERE status = "todo"
SORT due ASC
```

```dataview
TABLE company, role, met
FROM "10-People"
WHERE status = "active"
```
