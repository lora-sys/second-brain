# Contributing

感谢愿意花时间让这个项目更好。

## 行为准则

Be kind. Be helpful. Assume good faith. We're all here because we like making
things and we like keeping our notes in plain text.

## 报告 Bug

用 [Issue 模板](../../issues/new?template=bug_report.md) 报告。尽量提供：

- 复现步骤（最好是一段可粘贴的命令或脚本）
- 期望行为 vs 实际行为
- 浏览器 / 操作系统 / Node 版本
- 服务端日志（终端输出）
- 如果和 Obsidian 文件相关，附上相关 `.md` 文件内容

## 提出 Feature

用 [Issue 模板](../../issues/new?template=feature_request.md)。说清楚：

- 要解决的真实问题（不是「我想加个按钮」）
- 你建议的交互
- 替代方案

## 提 PR

1. **先开 Issue 讨论**，避免做出来发现方向不对
2. Fork → 建分支（`feat/xxx` 或 `fix/xxx`）
3. 保持 PR 小而专注（一个 PR = 一件事）
4. 跑 `npm run check` 确保语法没问题
5. 如果改了 UI，在 PR 描述里附上截图 / 录屏
6. 描述怎么手动验证

### 本地开发

```bash
git clone https://github.com/lora-sys/second-brain.git
cd second-brain
npm install

# 把 config.json 里的 vaultPath 改成你自己的
npm run dev          # 用 node --watch，改 lib/ 自动重启
# 改 public/ 只需浏览器刷新
```

### 项目约定

- **后端**：Node ESM（`.mjs`）。无框架，HTTP 原生。`lib/server.mjs` 是路由入口
- **前端**：原生 ESM（无构建）。`public/app.js` 是单页应用入口。**避免**引入框架
- **数据**：Markdown + YAML。frontmatter 解析要容错（用户会手动改文件）
- **依赖**：尽量少。`package.json` 里加新依赖前先讨论

### 设计原则

按重要性排序，提交前自检：

1. **能用** — 不破坏现有功能
2. **本地优先** — 不引入云依赖
3. **Obsidian 同步** — 所有数据必须仍然是 Vault 里的普通 Markdown 文件
4. **Obsidian 是 source of truth** — 网页可以是缓存、可以是视图，但不能是唯一来源
5. **Git 友好** — 纯文本、可 diff、可恢复
6. **零构建** — 不要引入 webpack / vite / rollup / 等
7. **少依赖** — 加依赖前先想能不能用 Node 标准库

## 代码风格

- 2 空格缩进
- 单引号优先（JSON / YAML 用双引号）
- 不引入 prettier / eslint 之类的工具链（保持零依赖）
- 命名：`camelCase` for JS，`kebab-case` for CSS class 和 file names

## 发布流程

维护者：

1. 改 `package.json` 的 version
2. 写 `CHANGELOG.md` 的新版本段
3. `git tag -a vX.Y.Z -m "..."`
4. `git push --tags`
5. `gh release create vX.Y.Z` 上传二进制附件（如 demo 视频）
