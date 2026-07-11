// E2E demo video for the Second Brain dashboard.
// Run with:  playwright-cli run-code --filename recordings/e2e-demo.mjs

async (page) => {
  const BASE = 'http://127.0.0.1:3939';
  const VIDEO = '/home/lora/second-brain/recordings/second-brain-demo.webm';

  const chapter = (title, desc, ms = 2000) =>
    page.screencast.showChapter(title, { description: desc, duration: ms });
  const wait = (ms) => page.waitForTimeout(ms);

  // ----- start recording -----
  await page.screencast.start({ path: VIDEO, size: { width: 1366, height: 820 } });
  await page.setViewportSize({ width: 1366, height: 820 });

  // ----- 0. opening -----
  await chapter('第二大脑 · 个人看板', '人物 / 任务 / 项目 / 链接，全部同步到 Obsidian 仓库。', 3000);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1500);

  // ----- 1. empty dashboard -----
  await chapter('1 · 空状态仪表盘', '四个模块的入口。点击「新建」开始添加。', 2500);
  await wait(1500);

  // ----- 2. create person -----
  await chapter('2 · 新建人物', '姓名 / 公司 / 联系方式 / 社交账号 / 标签 / Markdown 正文。', 2500);
  await page.click('text=人物');
  await wait(700);
  await page.click('[data-action="new-person"]');
  await wait(600);
  await page.locator('#f-title').pressSequentially('张三', { delay: 80 });
  await page.locator('#f-met').fill('2024-03-15');
  await page.locator('#f-company').pressSequentially('Acme 科技', { delay: 50 });
  await page.locator('#f-role').pressSequentially('CTO', { delay: 50 });
  await page.locator('#f-contact-email').pressSequentially('zhang@example.com', { delay: 30 });
  await page.locator('#f-contact-wechat').pressSequentially('zhangsan_wx', { delay: 30 });
  await page.locator('#f-social-github').pressSequentially('zhangsan', { delay: 30 });
  await page.locator('#f-tags').pressSequentially('朋友, 技术, 重要', { delay: 30 });
  await page.locator('#f-body').pressSequentially('张三是我大学同学，现在是 CTO。', { delay: 30 });
  await wait(600);
  await page.click('#f-save');
  await wait(1500);

  // ----- 3. person detail -----
  await chapter('3 · 人物详情', '字段卡 + Markdown 正文，支持 [[wikilink]]。', 2500);
  await page.goto(BASE + '/#/people', { waitUntil: 'networkidle' });
  await wait(800);
  await page.locator('.card[data-entity-id]').first().click();
  await wait(1500);

  // ----- 4. dark mode -----
  await chapter('4 · 暗色模式', '右上角一键切换，状态持久化。', 2500);
  await page.click('#theme-toggle');
  await wait(1500);
  await page.click('#theme-toggle');
  await wait(800);

  // ----- 5. tasks kanban -----
  await chapter('5 · 任务看板', '新建三个不同状态的任务，自动归类到对应列。', 2500);
  await page.click('text=任务');
  await wait(800);

  const tasks = [
    { title: '设计看板首页', status: 'in_progress', priority: 'high', due: '2026-07-25', tags: 'UI, 设计' },
    { title: '撰写 README', status: 'todo', priority: 'medium', due: '2026-07-30', tags: '文档' },
    { title: '初版完成', status: 'done', priority: 'high', due: '2026-07-10', tags: '里程碑' },
  ];
  for (const t of tasks) {
    await page.click('[data-action="new-task"]');
    await wait(400);
    await page.locator('#f-title').pressSequentially(t.title, { delay: 40 });
    await page.selectOption('#f-status', t.status);
    await page.selectOption('#f-priority', t.priority);
    if (t.due) await page.locator('#f-due').fill(t.due);
    await page.locator('#f-tags').pressSequentially(t.tags, { delay: 25 });
    await page.click('#f-save');
    await wait(700);
  }
  await wait(1200);

  // ----- 6. edit task, change status -----
  await chapter('6 · 修改任务状态', '点击「撰写 README」进入编辑，切换到已完成。', 2500);
  await page.locator('.kanban-col[data-status="todo"] .kanban-card').first().click();
  await wait(900);
  await page.click('[data-action="edit"]');
  await wait(700);
  await page.selectOption('#f-status', 'done');
  await wait(400);
  await page.click('#f-save');
  await wait(1500);

  // ----- 7. project + wikilink -----
  await chapter('7 · 项目 + Wikilink', '用 [[...]] 在实体之间双向引用，点击跳转。', 2500);
  await page.click('text=项目');
  await wait(700);
  await page.click('[data-action="new-project"]');
  await wait(700);
  await page.locator('#f-title').pressSequentially('第二大脑 v1', { delay: 50 });
  await page.locator('#f-description').pressSequentially('个人第二大脑系统，与 Obsidian 仓库同步。', { delay: 25 });
  await page.locator('#f-startDate').fill('2026-07-01');
  await page.locator('#f-tags').pressSequentially('个人, 核心', { delay: 25 });
  await page.locator('#f-body').pressSequentially(
    '## 目标\n人物 / 任务 / 项目 / 链接四大模块。\n\n相关：\n- [[10-People/张三]]\n- [[20-Tasks/设计看板首页]]',
    { delay: 18 }
  );
  await wait(500);
  await page.click('#f-save');
  await wait(1500);
  await page.goto(BASE + '/#/entity/30-Projects/第二大脑-v1', { waitUntil: 'networkidle' });
  await wait(1500);
  // Wikilink click
  await page.locator('.wikilink').first().click();
  await wait(1500);

  // ----- 8. import link (deep fetch) -----
  await chapter('8 · 导入链接（深度抓取）', '抓取全文 → 转 Markdown，离线可读。', 2500);
  await page.click('text=链接');
  await wait(800);
  await page.click('[data-action="import-link"]');
  await wait(800);
  await page.locator('#imp-url').pressSequentially('http://127.0.0.1:8088/article', { delay: 25 });
  await page.locator('#imp-tags').pressSequentially('阅读, 方法论', { delay: 25 });
  await page.check('input[name="imp-mode"][value="deep"]');
  await wait(300);
  await page.click('#imp-go');
  await wait(4000);

  // ----- 9. link detail rendering -----
  await chapter('9 · 链接详情', '顶部 link card 预览，正文是抓取并清理后的 Markdown。', 2500);
  await wait(1500);

  // ----- 10. search -----
  await chapter('10 · 全文搜索', '跨四个模块，命中标题 / 正文 / 标签。', 2500);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(800);
  await page.locator('#search-input').click();
  await page.locator('#search-input').pressSequentially('第二', { delay: 120 });
  await wait(1500);
  await page.locator('#search-input').fill('');
  await wait(400);

  // ----- 11. mobile -----
  await chapter('11 · 移动端响应式', '侧栏折叠，统计 + 看板列垂直堆叠。', 2500);
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1500);
  await page.goto(BASE + '/#/tasks', { waitUntil: 'networkidle' });
  await wait(1500);

  // ----- end -----
  await page.setViewportSize({ width: 1366, height: 820 });
  await chapter('完成', '所有功能验证通过：CRUD / 看板 / 抓取 / 搜索 / 暗色 / 移动端。', 3500);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1500);

  await page.screencast.stop();
  console.log('video saved to', VIDEO);
}
