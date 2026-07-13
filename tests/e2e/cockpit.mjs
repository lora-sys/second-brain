async (page) => {
  // v0.4.c7 E2E tests for the cockpit + standard mode.
  // Run with:
  //   playwright-cli open
  //   playwright-cli run-code --filename tests/e2e/cockpit.mjs

  const BASE = 'http://127.0.0.1:3939';
  const tally = { passed: 0, failed: 0 };

  function pass(name) { console.log('  PASS  ' + name); tally.passed++; }
  function fail(name, msg) { console.log('  FAIL  ' + name + ': ' + msg); tally.failed++; }
  async function t(name, fn) {
    try { await fn(); pass(name); } catch (e) { fail(name, e.message); }
  }

  await t('standard mode: dashboard renders', async () => {
    await page.goto(BASE);
    await page.waitForTimeout(2500);
    const has = await page.evaluate(() => !!document.querySelector('.dash-hero'));
    if (!has) throw new Error('no .dash-hero');
  });

  await t('standard mode: sidebar has 6+ nav items', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.nav-link').length);
    if (n < 6) throw new Error('nav items: ' + n);
  });

  await page.goto(BASE + '/?cockpit=1');
  await page.waitForTimeout(2500);

  await t('cockpit: shell renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit'));
    if (!has) throw new Error('no .cockpit');
  });

  await t('cockpit: 10 nav items (6 primary + 4 resource)', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-nav-item').length);
    if (n !== 10) throw new Error('expected 10, got ' + n);
  });

  await t('cockpit: 今日 panel has 3 main blocks', async () => {
    const blocks = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-today-block .cockpit-block-title')).map(e => e.textContent));
    for (const need of ['今日感悟', '今日成就', '今日关注']) {
      if (!blocks.includes(need)) throw new Error('missing ' + need);
    }
  });

  await t('cockpit: right rail has 任务与提醒 + 即将到来', async () => {
    const t = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-rail .cockpit-block-title')).map(e => e.textContent));
    if (!t.includes('任务与提醒')) throw new Error('missing 任务与提醒');
    if (!t.includes('即将到来')) throw new Error('missing 即将到来');
  });

  await t('cockpit: bottom row has 3 blocks (捕获/收藏/记忆回顾)', async () => {
    const t = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-bottom-row .cockpit-block-title')).map(e => e.textContent));
    for (const need of ['捕获的想法', '收藏与书签', '记忆回顾']) {
      if (!t.includes(need)) throw new Error('missing ' + need);
    }
  });

  // 笔记库
  await page.goto(BASE + '/?cockpit=1#/notes');
  await page.waitForTimeout(1500);
  await t('笔记库: 4 type sections', async () => {
    const t = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-notes-title')).map(e => e.textContent));
    for (const need of ['人物', '任务', '项目', '链接']) {
      if (!t.includes(need)) throw new Error('missing ' + need);
    }
  });

  // 标签
  await page.goto(BASE + '/?cockpit=1#/tags');
  await page.waitForTimeout(1500);
  await t('标签: tag cloud has chips', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-tag-chip').length);
    if (n === 0) throw new Error('no tag chips');
  });

  // 回顾
  await page.goto(BASE + '/?cockpit=1#/review');
  await page.waitForTimeout(1500);
  await t('回顾: has day sections', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-review-day').length);
    if (n === 0) throw new Error('no day sections');
  });

  // 日程
  await page.goto(BASE + '/?cockpit=1#/schedule');
  await page.waitForTimeout(1500);
  await t('日程: schedule page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-schedule') || !!document.querySelector('.cockpit-schedule-empty'));
    if (!has) throw new Error('schedule page did not render');
  });

  console.log('## Summary: ' + tally.passed + ' passed, ' + tally.failed + ' failed');
  if (tally.failed > 0) {
    console.error('FAILURES: ' + JSON.stringify(tally));
  }
}
