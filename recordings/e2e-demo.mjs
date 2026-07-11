async (page) => {
  const BASE = 'http://127.0.0.1:3939';
  const VIDEO = '/home/lora/second-brain/recordings/second-brain-demo.webm';

  const chapter = (title, desc, ms = 2000) =>
    page.screencast.showChapter(title, { description: desc, duration: ms });
  const wait = (ms) => page.waitForTimeout(ms);

  await page.screencast.start({ path: VIDEO, size: { width: 1366, height: 820 } });
  await page.setViewportSize({ width: 1366, height: 820 });

  // 0. opening
  await chapter('第二大脑 · 个人看板', '人物 / 任务 / 项目 / 链接，全部同步到 Obsidian 仓库。', 3000);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1800);

  // 1. dashboard overview
  await chapter('1 · 仪表盘改版', '类型化统计卡、任务进度条、即将到期、标签云', 2500);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(2000);

  // 2. Cmd+K command palette
  await chapter('2 · ⌘K 命令面板', '模糊搜索 + 快捷命令', 2500);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1500);
  await page.keyboard.press('Control+K');
  await wait(700);
  await page.keyboard.type('任务');
  await wait(700);
  await page.keyboard.press('Enter');
  await wait(1500);

  // 3. people
  await chapter('3 · 人物卡片', '头像渐变 + 类型色边条 + 状态标签', 2500);
  await page.goto(BASE + '/#/people', { waitUntil: 'networkidle' });
  await wait(1500);

  // 4. person detail
  await page.locator('.card[data-entity-id]').first().click();
  await wait(1500);

  // 5. task kanban (drag-and-drop)
  await chapter('5 · 任务看板 + 拖拽', '把任务拖到其他列 = 切换状态', 3000);
  await page.goto(BASE + '/#/tasks', { waitUntil: 'networkidle' });
  await wait(1500);
  // Drag first todo to in_progress
  await page.dragAndDrop('.kanban-col[data-status="todo"] .kanban-card', '.kanban-col[data-status="in_progress"]', { force: true });
  await wait(1500);

  // 6. project + wikilinks
  await chapter('6 · 项目详情 + Wikilink', '[[...]] 双向引用，点击跳转', 2500);
  await page.goto(BASE + '/#/entity/30-Projects/second-brain-v1', { waitUntil: 'networkidle' });
  await wait(1800);
  // Click a wikilink to demonstrate
  await page.locator('.wikilink').first().click();
  await wait(1500);

  // 7. themes
  await chapter('7 · 主题切换', '浅色 / 深色 / 复古 三套主题', 2500);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1000);
  await page.click('#theme-toggle');
  await wait(1200);
  await page.click('#theme-toggle');
  await wait(1200);
  await page.click('#theme-toggle');
  await wait(1200);

  // 8. mobile
  await chapter('8 · 移动端响应式', '侧栏折叠，统计 + 看板列垂直堆叠', 2500);
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(1500);
  await page.goto(BASE + '/#/tasks', { waitUntil: 'networkidle' });
  await wait(1500);

  // end
  await page.setViewportSize({ width: 1366, height: 820 });
  await chapter('完成', '所有功能 + 视觉升级到位。可以日常使用了。', 3000);
  await page.goto(BASE + '/#/dashboard', { waitUntil: 'networkidle' });
  await wait(2000);

  await page.screencast.stop();
  console.log('video saved to', VIDEO);
}
