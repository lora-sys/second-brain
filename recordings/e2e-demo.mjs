async (page) => {
  const BASE = 'http://127.0.0.1:3939';
  const VIDEO = '/home/lora/second-brain/recordings/second-brain-demo.webm';

  const chapter = (title, desc, ms = 2000) =>
    page.screencast.showChapter(title, { description: desc, duration: ms });
  const wait = (ms) => page.waitForTimeout(ms);

  await page.screencast.start({ path: VIDEO, size: { width: 1366, height: 820 } });
  await page.setViewportSize({ width: 1366, height: 820 });

  // 0. opening
  await chapter('第二大脑 · 个人看板', '人物 / 任务 / 项目 / 链接，同步到 Obsidian 仓库。', 3000);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1800);

  // 1. dashboard
  await chapter('1 · 仪表盘', '类型化统计、任务进度、即将到期、标签云', 2500);
  await wait(1500);

  // 2. wikilink autocomplete (v0.3 main feature)
  await chapter('2 · Wikilink 自动补全 ⌃v0.3', '输入 [[ 触发浮层，键盘选择，回车插入', 3000);
  await page.goto(BASE + '/#/tasks', { waitUntil: 'networkidle' });
  await wait(1200);
  await page.click('[data-action="new-task"]');
  await wait(2500);
  await page.locator('#f-body').click();
  await page.keyboard.type('参考 [[');
  await wait(800);
  await page.keyboard.type('陈');
  await wait(500);
  await page.keyboard.press('Enter');
  await wait(800);
  // Close modal
  await page.evaluate(() => document.querySelector('.modal-close')?.click());
  await wait(500);

  // 3. inline status switcher
  await chapter('3 · 任务卡片 inline 状态切换', '点状态徽章直接切换，不用开 modal', 2500);
  await page.waitForTimeout(500);
  await page.click('.kanban-card-status');
  await wait(1000);

  // 4. tag filter
  await chapter('4 · 标签筛选', '顶部 chip 多选，AND 逻辑', 2500);
  await page.goto(BASE + '/#/people', { waitUntil: 'networkidle' });
  await wait(1500);
  const chip = await page.$('.tag-filter-chip');
  if (chip) {
    await chip.click();
    await wait(800);
  }

  // 5. smart mentions
  await chapter('5 · Smart mentions', '渲染时把已知实体名自动转成 wikilink', 2500);
  await page.goto(BASE + '/#/entity/30-Projects/second-brain-v1', { waitUntil: 'networkidle' });
  await wait(2000);

  // 6. drag and drop
  await chapter('6 · 看板拖拽', '拖卡片到其他列 = 切换状态', 3000);
  await page.goto(BASE + '/#/tasks', { waitUntil: 'networkidle' });
  await wait(1500);
  await page.dragAndDrop('.kanban-col[data-status="todo"] .kanban-card', '.kanban-col[data-status="in_progress"]', { force: true });
  await wait(1500);

  // 7. themes
  await chapter('7 · 主题切换', '浅色 / 深色 / 复古', 2500);
  await page.click('#theme-toggle');
  await wait(1000);
  await page.click('#theme-toggle');
  await wait(1000);
  await page.click('#theme-toggle');
  await wait(1000);

  // 8. mobile
  await chapter('8 · 移动端响应式', '侧栏折叠，统计 + 看板列垂直堆叠', 2500);
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1500);
  await page.goto(BASE + '/#/tasks', { waitUntil: 'networkidle' });
  await wait(1500);

  // end
  await page.setViewportSize({ width: 1366, height: 820 });
  await chapter('v0.3 完成', 'Wikilink 自动补全 + Smart mentions + inline 状态切换 + 标签筛选', 3000);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(2000);

  await page.screencast.stop();
  console.log('video saved');
}
