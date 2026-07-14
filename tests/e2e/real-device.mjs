async (page) => {
  // v0.4.7 — Real-device end-to-end test.
  // Writes results to window.__testTally for the caller to read.

  const BASE = 'http://127.0.0.1:3939';
  const tally = { passed: 0, failed: 0, results: [], started: Date.now() };
  

  function pass(name) { console.log('  PASS  ' + name); tally.passed++; tally.results.push({ name, ok: true }); }
  function fail(name, msg) { console.log('  FAIL  ' + name + ': ' + msg); tally.failed++; tally.results.push({ name, ok: false, msg }); }
  async function t(name, fn) {
    try { await fn(); pass(name); } catch (e) { fail(name, e.message); }
  }
  const shot = (p) => page.screenshot({ path: p, type: 'png' });

  await page.goto(BASE);
  await page.waitForTimeout(2000);
  await t('standard: dashboard renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.dash-hero'));
    if (!has) throw new Error('no .dash-hero');
  });
  await t('standard: sidebar has 6+ nav items', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.nav-link').length);
    if (n < 6) throw new Error('nav items: ' + n);
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/01-standard-dashboard.png');

  await page.goto(BASE + '/?cockpit=1');
  await page.waitForTimeout(2000);
  await t('cockpit: shell renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit'));
    if (!has) throw new Error('no .cockpit');
  });
  await t('cockpit: 10 nav items', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-nav-item').length);
    if (n !== 11) throw new Error('expected 11, got ' + n);
  });
  await t('cockpit: today has 3 blocks', async () => {
    const blocks = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-today-block .cockpit-block-title')).map(e => e.textContent));
    for (const need of ['今日感悟', '今日成就', '今日关注']) {
      if (!blocks.includes(need)) throw new Error('missing ' + need);
    }
  });
  await t('cockpit: right rail has 任务与提醒 + 即将到来', async () => {
    const titles = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-rail .cockpit-block-title')).map(e => e.textContent));
    if (!titles.includes('任务与提醒')) throw new Error('missing 任务与提醒');
    if (!titles.includes('即将到来')) throw new Error('missing 即将到来');
  });
  await t('cockpit: bottom row has 3 blocks', async () => {
    const titles = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-bottom-row .cockpit-block-title')).map(e => e.textContent));
    for (const need of ['捕获的想法', '收藏与书签', '记忆回顾']) {
      if (!titles.includes(need)) throw new Error('missing ' + need);
    }
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/02-cockpit-today.png');

  await page.goto(BASE + '/?cockpit=1#/notes');
  await page.waitForTimeout(1500);
  await t('notes: 4 type sections', async () => {
    const titles = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-notes-title')).map(e => e.textContent));
    for (const need of ['人物', '任务', '项目', '链接']) {
      if (!titles.includes(need)) throw new Error('missing ' + need);
    }
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/03-cockpit-notes.png');

  await page.goto(BASE + '/?cockpit=1#/tags');
  await page.waitForTimeout(1500);
  await t('tags: tag cloud has chips', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-tag-chip').length);
    if (n === 0) throw new Error('no tag chips');
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/04-cockpit-tags.png');

  await page.goto(BASE + '/?cockpit=1#/review');
  await page.waitForTimeout(1500);
  await t('review: has day sections', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-review-day').length);
    if (n === 0) throw new Error('no day sections');
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/05-cockpit-review.png');

  await page.goto(BASE + '/?cockpit=1#/schedule');
  await page.waitForTimeout(1500);
  await t('schedule: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-schedule') || !!document.querySelector('.cockpit-schedule-empty'));
    if (!has) throw new Error('schedule page did not render');
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/06-cockpit-schedule.png');

  await page.goto(BASE + '/?cockpit=1#/settings');
  await page.waitForTimeout(1500);
  await t('settings: form renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-settings') || !!document.querySelector('input[name="vaultPath"]'));
    if (!has) throw new Error('settings form did not render');
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/07-cockpit-settings.png');

  await page.goto(BASE + '/?cockpit=1#/tasks');
  await page.waitForTimeout(1500);
  await t('tasks: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.kanban') || !!document.querySelector('.tasks-list') || !!document.querySelector('.cockpit-tasks'));
    if (!has) throw new Error('tasks page did not render');
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/08-cockpit-tasks.png');

  await page.goto(BASE + '/?cockpit=1#/resources');
  await page.waitForTimeout(1500);
  await t('resources: links page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('#links-list') || !!document.querySelector('.grid'));
    if (!has) throw new Error('resources page did not render');
  });
  await shot('docs/evidence/v0.4.7-real-device/screenshots/09-cockpit-resources.png');

  // ---- 知识图谱 ----
  await page.goto(BASE + '/?cockpit=1#/knowledge');
  await page.waitForTimeout(1500);
  await t('knowledge: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-knowledge'));
    if (!has) throw new Error('knowledge page did not render');
  });
  await t('knowledge: hero shows entity + connection counts', async () => {
    const heroText = await page.evaluate(() => {
      const hero = document.querySelector('.cockpit-knowledge-hero p');
      return hero ? hero.textContent : '';
    });
    if (!heroText.includes('entities')) throw new Error('hero missing entities count: ' + heroText);
    if (!heroText.includes('连接')) throw new Error('hero missing connection count: ' + heroText);
  });
  await t('knowledge: type distribution has 4 clusters', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-knowledge-cluster').length);
    if (n !== 4) throw new Error('expected 4 clusters, got ' + n);
  });
  await t('knowledge: has at least one hub (with seed wikilinks)', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-knowledge-hub').length);
    if (n === 0) throw new Error('no hubs');
  });
  await t('cockpit: 知识图谱 nav does NOT have soon badge', async () => {
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cockpit-nav-item')).map(el => ({
        text: el.textContent.trim(),
        soon: el.classList.contains('is-soon'),
      }));
    });
    const kgEntry = labels.find(l => l.text.includes('知识图谱'));
    if (!kgEntry) throw new Error('no 知识图谱 nav item');
    if (kgEntry.soon) throw new Error('BUG: 知识图谱 still shows soon badge but renderKnowledge exists');
  });

  // ---- 模板 ----
  await page.goto(BASE + '/?cockpit=1#/templates');
  await page.waitForTimeout(1500);
  await t('templates: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-templates'));
    if (!has) throw new Error('templates page did not render');
  });
  await t('templates: hero shows template count', async () => {
    const heroText = await page.evaluate(() => {
      const hero = document.querySelector('.cockpit-templates-hero p');
      return hero ? hero.textContent : '';
    });
    if (!heroText.includes('模板')) throw new Error('hero missing template count: ' + heroText);
    if (!heroText.includes('类型')) throw new Error('hero missing type count: ' + heroText);
  });
  await t('templates: 4 type groups', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-template-group').length);
    if (n !== 4) throw new Error('expected 4 groups, got ' + n);
  });
  await t('templates: at least 10 template cards', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-template-card').length);
    if (n < 10) throw new Error('expected 10+ cards, got ' + n);
  });
  await t('cockpit: 模板 nav does NOT have soon badge', async () => {
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cockpit-nav-item')).map(el => ({
        text: el.textContent.trim(),
        soon: el.classList.contains('is-soon'),
      }));
    });
    const tplEntry = labels.find(l => l.text.includes('模板'));
    if (!tplEntry) throw new Error('no 模板 nav item');
    if (tplEntry.soon) throw new Error('BUG: 模板 still shows soon badge but renderTemplates exists');
  });

  // Bug-hunt: 回顾 sidebar must not show 'soon' badge.
  await page.goto(BASE + '/?cockpit=1');
  await page.waitForTimeout(1500);
  await t('cockpit: 回顾 nav does NOT have soon badge', async () => {
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cockpit-nav-item')).map(el => ({
        text: el.textContent.trim(),
        soon: el.classList.contains('is-soon'),
      }));
    });
    const reviewEntry = labels.find(l => l.text.includes('回顾'));
    if (!reviewEntry) throw new Error('no 回顾 nav item');
    if (reviewEntry.soon) throw new Error('BUG: 回顾 still shows soon badge but renderReview exists');
  });

  // API contract tests
  await t('API: /api/health ok', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/health');
      return { ok: x.ok, status: x.status };
    });
    if (!r.ok) throw new Error('health not ok: ' + JSON.stringify(r));
  });
  await t('API: /api/dashboard has counts', async () => {
    const n = await page.evaluate(async () => {
      const x = await fetch('/api/dashboard');
      const d = await x.json();
      return d && d.counts ? Object.keys(d.counts).length : 0;
    });
    if (n === 0) throw new Error('dashboard has no counts');
  });
  await t('API: /api/entities returns object with items', async () => {
    const n = await page.evaluate(async () => {
      const x = await fetch('/api/entities');
      const d = await x.json();
      return d && Array.isArray(d.items) ? d.items.length : -1;
    });
    if (n < 0) throw new Error('entities did not return items array');
  });

  tally.ended = Date.now();
  tally.duration_ms = tally.ended - tally.started;
  
    await page.evaluate((t) => { window.__testTally = t; }, tally);
  console.log('## ' + tally.passed + ' passed, ' + tally.failed + ' failed in ' + tally.duration_ms + 'ms');
}
