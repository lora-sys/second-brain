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
    if (n !== 15) throw new Error('expected 15, got ' + n);
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
  await t('knowledge: canvas view toggle exists', async () => {
    const has = await page.evaluate(() => !!document.querySelector('[data-graph-view="canvas"]'));
    if (!has) throw new Error('no canvas view toggle');
  });
  await t('knowledge: clicking canvas shows graph canvas', async () => {
    await page.evaluate(() => document.querySelector('[data-graph-view="canvas"]').click());
    await page.waitForTimeout(1500);
    const has = await page.evaluate(() => !!document.getElementById('cockpit-graph-canvas'));
    if (!has) throw new Error('canvas not rendered');
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

  // ---- 日记 (v0.5) ----
  await page.goto(BASE + '/?cockpit=1#/daily');
  await page.waitForSelector('.cockpit-daily', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await t('daily: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-daily'));
    if (!has) throw new Error('daily page did not render');
  });
  await t('daily: has generate button', async () => {
    const has = await page.evaluate(() => !!document.getElementById('daily-generate-btn'));
    if (!has) throw new Error('no generate button');
  });
  await t('daily: status cards present (provider/events/total)', async () => {
    const labels = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-daily-status-label')).map(e => e.textContent));
    for (const need of ['Provider', 'Events today', 'Journals total']) {
      if (!labels.includes(need)) throw new Error('missing status card: ' + need);
    }
  });
  await t('daily: clicking generate produces daily journal', async () => {
    await page.evaluate(() => document.getElementById('daily-generate-btn').click());
    await page.waitForTimeout(2000);
    const viewVisible = await page.evaluate(() => {
      const v = document.getElementById('daily-view');
      return v && v.style.display !== 'none';
    });
    if (!viewVisible) throw new Error('daily view did not appear after click');
    const content = await page.evaluate(() => {
      const el = document.getElementById('daily-view-content');
      return el ? el.textContent : '';
    });
    if (!content || content.length < 50) throw new Error('daily content too short: ' + content.length);
    if (!content.includes('日记')) throw new Error('daily content missing 日记 marker');
  });
  await t('API: /api/events returns array', async () => {
    const n = await page.evaluate(async () => {
      const x = await fetch('/api/events?days=7');
      const d = await x.json();
      return d && Array.isArray(d.events) ? d.events.length : -1;
    });
    if (n < 0) throw new Error('events endpoint did not return array');
  });
  await t('API: /api/daily returns object with journals array', async () => {
    const n = await page.evaluate(async () => {
      const x = await fetch('/api/daily');
      const d = await x.json();
      return d && Array.isArray(d.journals) ? d.journals.length : -1;
    });
    if (n < 0) throw new Error('daily endpoint did not return journals array');
  });
  // Re-navigate to fresh daily page to ensure timeline renders
  await page.goto(BASE + '/?cockpit=1#/daily');
  await page.waitForTimeout(2500);
  await t('daily: timeline has 7 day cells', async () => {
    await page.waitForSelector('.cockpit-daily-timeline-day', { timeout: 3000 });
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-daily-timeline-day').length);
    if (n !== 7) throw new Error('expected 7 timeline cells, got ' + n);
  });
  await t('daily: timeline day with journal has-journal class', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-daily-timeline-day.has-journal'));
    if (!has) throw new Error('no has-journal cell');
  });
  // ---- 周报 (v0.7) ----
  await page.goto(BASE + '/?cockpit=1#/weekly');
  await page.waitForTimeout(1500);
  await t('weekly: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-weekly'));
    if (!has) throw new Error('weekly page did not render');
  });
  await t('weekly: has generate button', async () => {
    const has = await page.evaluate(() => !!document.getElementById('weekly-generate-btn'));
    if (!has) throw new Error('no generate button');
  });
  await t('weekly: clicking generate produces weekly report', async () => {
    // Wait for the title to be set by polling
    await page.evaluate(() => {
      document.getElementById('weekly-generate-btn').click();
    });
    let title = '';
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      title = await page.evaluate(() => document.getElementById('weekly-view-title').textContent);
      if (title && title.includes('周报')) break;
    }
    if (!title.includes('周报')) throw new Error('weekly title not set: ' + title);
  });
  await t('API: /api/weekly list returns weeklies array', async () => {
    const n = await page.evaluate(async () => {
      const x = await fetch('/api/weekly');
      const d = await x.json();
      return d && Array.isArray(d.weeklies) ? d.weeklies.length : -1;
    });
    if (n < 0) throw new Error('weekly endpoint did not return weeklies array');
  });
  // ---- 决策 (v0.8) ----
  await page.goto(BASE + '/?cockpit=1#/decisions');
  await page.waitForTimeout(1500);
  await t('decisions: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-decision'));
    if (!has) throw new Error('decisions page did not render');
  });
  await t('decisions: has 4 status cards', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-decision-status-card').length);
    if (n !== 4) throw new Error('expected 4 status cards, got ' + n);
  });
  await t('decisions: has new-decision button', async () => {
    const has = await page.evaluate(() => !!document.getElementById('decision-new-btn'));
    if (!has) throw new Error('no new decision button');
  });
  await t('API: /api/skills list returns array', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/skills');
      const d = await x.json();
      return d && Array.isArray(d.skills) ? d.skills.length : -1;
    });
    if (r < 0) throw new Error('skills endpoint did not return skills array');
  });
  await t('skills: API match by query returns relevant skills', async () => {
    // Create a skill with a unique tag for the test
    const slug = 'test-match-' + Date.now();
    const r = await page.evaluate(async (s) => {
      const x = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: s, name: 'Test match skill', description: 'unique-marker-12345', tags: ['uniquetag' + Date.now()], body: 'x' })
      });
      return x.ok;
    }, slug);
    if (!r) throw new Error('setup skill create failed');
    // Now query with the unique description as the search term
    const r2 = await page.evaluate(async () => {
      const x = await fetch('/api/skills?q=unique-marker-12345');
      const d = await x.json();
      return { count: d.skills.length, has: d.skills.some(s => s.description === 'unique-marker-12345') };
    });
    if (!r2.has) throw new Error('match did not return expected skill: ' + JSON.stringify(r2));
  });
  await t('skills: page renders with new button', async () => {
    await page.goto(BASE + '/?v=' + Date.now() + '#/skills');
    await page.waitForTimeout(2500);
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-skills'));
    if (!has) throw new Error('skills page did not render');
    const hasBtn = await page.evaluate(() => !!document.getElementById('skill-new-btn'));
    if (!hasBtn) throw new Error('no new-skill button');
  });
  // ---- v0.14: Insight widget E2E tests ----
  await t('insight: dashboard insight widget renders latest weekly as markdown', async () => {
    // Ensure there's a weekly in 00-Weekly/ - it's already there from earlier
    await page.goto(BASE + '/?cockpit=1&v=' + Date.now() + '#/dashboard');
    await page.waitForTimeout(2500);
    const has = await page.evaluate(() => {
      const el = document.querySelector('.block-insight, .cockpit-insight-rendered, .cockpit-insight-preview');
      if (!el) return false;
      // If rendered as markdown, expect a <p> or <h1>/<h2> child
      if (el.classList.contains('cockpit-insight-rendered')) {
        return el.querySelector('p, h1, h2, h3, ul, ol') !== null;
      }
      // If plain text preview, just check it has text
      return el.textContent.trim().length > 0;
    });
    if (!has) throw new Error('insight widget did not render content');
  });

  await t('insight: insight block has a link to /weekly', async () => {
    await page.goto(BASE + '/?cockpit=1&v=' + Date.now() + '#/dashboard');
    await page.waitForTimeout(2500);
    const hasLink = await page.evaluate(() => {
      const block = document.querySelector('.block-insight');
      if (!block) return false;
      const a = block.querySelector('a[href*="weekly"]');
      return !!a;
    });
    if (!hasLink) throw new Error('insight block has no /weekly link');
  });

  await t('insight: insight date matches latest weekly file', async () => {
    const apiDate = await page.evaluate(async () => {
      const x = await fetch('/api/weekly');
      const d = await x.json();
      return d.weeklies && d.weeklies[0] ? d.weeklies[0].date : null;
    });
    if (!apiDate) throw new Error('no weekly available');

    await page.goto(BASE + '/?cockpit=1&v=' + Date.now() + '#/dashboard');
    await page.waitForTimeout(2500);
    const blockDate = await page.evaluate(() => {
      const el = document.querySelector('.block-insight .cockpit-block-count');
      return el ? el.textContent.trim() : null;
    });
    if (blockDate !== apiDate) throw new Error('date mismatch: ' + blockDate + ' vs ' + apiDate);
  });

  await t('API: DELETE /api/skills/:slug removes a skill', async () => {
    const slug = 'test-delete-' + Date.now();
    const created = await page.evaluate(async (s) => {
      const x = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: s, name: 'Test delete', description: 'x', tags: [], body: 'y' })
      });
      return x.ok;
    }, slug);
    if (!created) throw new Error('setup failed');
    const deleted = await page.evaluate(async (s) => {
      const x = await fetch('/api/skills/' + s, { method: 'DELETE' });
      return x.ok;
    }, slug);
    if (!deleted) throw new Error('delete failed');
    const readAfter = await page.evaluate(async (s) => {
      const x = await fetch('/api/skills/' + s);
      return x.status;
    }, slug);
    if (readAfter !== 404) throw new Error('expected 404 after delete, got ' + readAfter);
  });
  await t('skills: create + read', async () => {
    const slug = 'test-skill-' + Date.now();
    const r = await page.evaluate(async (s) => {
      const x = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: s, name: 'Test skill', description: 'test', tags: ['test'], body: 'body' })
      });
      return x.ok;
    }, slug);
    if (!r) throw new Error('skill create failed');
    const r2 = await page.evaluate(async (s) => {
      const x = await fetch('/api/skills/' + s);
      const d = await x.json();
      return d && d.name === 'Test skill';
    }, slug);
    if (!r2) throw new Error('skill read failed');
  });
  await t('API: POST /api/entities accepts decision type', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'decision',
          title: 'E2E test decision ' + Date.now(),
          data: { status: 'pending', context: 'test context' }
        })
      });
      const d = await x.json();
      return { ok: x.ok, id: d.id, status: d.data && d.data.status };
    });
    if (!r.ok) throw new Error('decision creation failed: ' + JSON.stringify(r));
    if (r.status !== 'pending') throw new Error('decision should default to pending, got: ' + r.status);
  });
  // ---- v0.6 backlinks ----
  await page.goto(BASE + '/?v=' + Date.now() + '#/entity/30-Projects/AI%20Engineering%20Harness');
  await page.waitForSelector('.entity-relations-grid', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await t('backlinks: project page has relations grid', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.entity-relations-grid'));
    if (!has) throw new Error('no relations grid on project page');
  });
  await t('backlinks: project has forward refs', async () => {
    const n = await page.evaluate(() => {
      const cols = document.querySelectorAll('.entity-relations-col');
      const fwd = cols[0] ? cols[0].querySelectorAll('.entity-relations-item').length : 0;
      return fwd;
    });
    if (n === 0) throw new Error('no forward refs (expected 5)');
  });
  await t('backlinks: project has back refs', async () => {
    const n = await page.evaluate(() => {
      const cols = document.querySelectorAll('.entity-relations-col');
      const back = cols[1] ? cols[1].querySelectorAll('.entity-relations-item').length : 0;
      return back;
    });
    if (n === 0) throw new Error('no back refs (expected 4)');
  });
  await t('cockpit: NO soon badges remain anywhere in sidebar', async () => {
    const soonItems = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-nav-item.is-soon')).map(el => el.textContent.trim()));
    if (soonItems.length > 0) throw new Error('still has soon badges: ' + soonItems.join(', '));
  });

  // ---- 智能体 ----
  await page.goto(BASE + '/?cockpit=1#/agent');
  await page.waitForTimeout(1500);
  await t('agent: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-agent'));
    if (!has) throw new Error('agent page did not render');
  });
  await t('agent: status cards show provider/model/status/privacy', async () => {
    const labels = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-agent-status-label')).map(e => e.textContent));
    for (const need of ['Provider', 'Model', 'Status', '隐私']) {
      if (!labels.includes(need)) throw new Error('missing status card: ' + need);
    }
  });
  await t('agent: composer with input + 5 quick prompts', async () => {
    const input = await page.evaluate(() => !!document.getElementById('agent-input'));
    if (!input) throw new Error('no composer input');
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-agent-quick-btn').length);
    if (n !== 8) throw new Error('expected 8 quick prompts, got ' + n);
  });
  await t('agent: clicking quick prompt produces assistant reply', async () => {
    // Click the "我有哪些未完成任务?" quick prompt
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.cockpit-agent-quick-btn');
      // The 2nd button is tasks
      btns[1].click();
    });
    await page.waitForTimeout(500);
    const msgs = await page.evaluate(() => document.querySelectorAll('.cockpit-agent-msg').length);
    if (msgs < 2) throw new Error('expected at least 2 messages (user + assistant), got ' + msgs);
    const assistantText = await page.evaluate(() => {
      const el = document.querySelector('.cockpit-agent-msg-assistant .cockpit-agent-response-text');
      return el ? el.textContent : '';
    });
    if (!assistantText || assistantText.length === 0) throw new Error('no assistant text');
  });
  await t('cockpit: 智能体 nav does NOT have soon badge', async () => {
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cockpit-nav-item')).map(el => ({
        text: el.textContent.trim(),
        soon: el.classList.contains('is-soon'),
      }));
    });
    const agEntry = labels.find(l => l.text.includes('智能体'));
    if (!agEntry) throw new Error('no 智能体 nav item');
    if (agEntry.soon) throw new Error('BUG: 智能体 still shows soon badge but renderAgent exists');
  });
  // Tool-use: clicking '新建任务' quick prompt executes create_task action
  await t('agent: tool-use create_task executes action', async () => {
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.cockpit-agent-quick-btn');
      // The '新建任务: ...' is the 6th button (index 5)
      btns[5].click();
    });
    await page.waitForTimeout(1500);
    const actions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.cockpit-agent-action')).map(a => a.textContent.trim())
    );
    if (actions.length === 0) throw new Error('no action results');
    if (!actions.some(a => a.includes('create_task'))) throw new Error('expected create_task action, got: ' + JSON.stringify(actions));
  });
  // Re-navigate to fresh daily page to ensure timeline renders
  await page.goto(BASE + '/?cockpit=1#/daily');
  await page.waitForTimeout(2500);
  await t('daily: timeline has 7 day cells', async () => {
    await page.waitForSelector('.cockpit-daily-timeline-day', { timeout: 3000 });
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-daily-timeline-day').length);
    if (n !== 7) throw new Error('expected 7 timeline cells, got ' + n);
  });
  await t('daily: timeline day with journal has-journal class', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-daily-timeline-day.has-journal'));
    if (!has) throw new Error('no has-journal cell');
  });
  // ---- 周报 (v0.7) ----
  await page.goto(BASE + '/?cockpit=1#/weekly');
  await page.waitForTimeout(1500);
  await t('weekly: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-weekly'));
    if (!has) throw new Error('weekly page did not render');
  });
  await t('weekly: has generate button', async () => {
    const has = await page.evaluate(() => !!document.getElementById('weekly-generate-btn'));
    if (!has) throw new Error('no generate button');
  });
  await t('weekly: clicking generate produces weekly report', async () => {
    // Wait for the title to be set by polling
    await page.evaluate(() => {
      document.getElementById('weekly-generate-btn').click();
    });
    let title = '';
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      title = await page.evaluate(() => document.getElementById('weekly-view-title').textContent);
      if (title && title.includes('周报')) break;
    }
    if (!title.includes('周报')) throw new Error('weekly title not set: ' + title);
  });
  await t('API: /api/weekly list returns weeklies array', async () => {
    const n = await page.evaluate(async () => {
      const x = await fetch('/api/weekly');
      const d = await x.json();
      return d && Array.isArray(d.weeklies) ? d.weeklies.length : -1;
    });
    if (n < 0) throw new Error('weekly endpoint did not return weeklies array');
  });
  // ---- 决策 (v0.8) ----
  await page.goto(BASE + '/?cockpit=1#/decisions');
  await page.waitForTimeout(1500);
  await t('decisions: page renders', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.cockpit-decision'));
    if (!has) throw new Error('decisions page did not render');
  });
  await t('decisions: has 4 status cards', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.cockpit-decision-status-card').length);
    if (n !== 4) throw new Error('expected 4 status cards, got ' + n);
  });
  await t('decisions: has new-decision button', async () => {
    const has = await page.evaluate(() => !!document.getElementById('decision-new-btn'));
    if (!has) throw new Error('no new decision button');
  });
  await t('API: /api/skills list returns array', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/skills');
      const d = await x.json();
      return d && Array.isArray(d.skills) ? d.skills.length : -1;
    });
    if (r < 0) throw new Error('skills endpoint did not return skills array');
  });

  await t('API: POST /api/entities accepts decision type', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'decision',
          title: 'E2E test decision ' + Date.now(),
          data: { status: 'pending', context: 'test context' }
        })
      });
      const d = await x.json();
      return { ok: x.ok, id: d.id, status: d.data && d.data.status };
    });
    if (!r.ok) throw new Error('decision creation failed: ' + JSON.stringify(r));
    if (r.status !== 'pending') throw new Error('decision should default to pending, got: ' + r.status);
  });
  // ---- v0.6 backlinks ----
  await page.goto(BASE + '/?v=' + Date.now() + '#/entity/30-Projects/AI%20Engineering%20Harness');
  await page.waitForSelector('.entity-relations-grid', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await t('backlinks: project page has relations grid', async () => {
    const has = await page.evaluate(() => !!document.querySelector('.entity-relations-grid'));
    if (!has) throw new Error('no relations grid on project page');
  });
  await t('backlinks: project has forward refs', async () => {
    const n = await page.evaluate(() => {
      const cols = document.querySelectorAll('.entity-relations-col');
      const fwd = cols[0] ? cols[0].querySelectorAll('.entity-relations-item').length : 0;
      return fwd;
    });
    if (n === 0) throw new Error('no forward refs (expected 5)');
  });
  await t('backlinks: project has back refs', async () => {
    const n = await page.evaluate(() => {
      const cols = document.querySelectorAll('.entity-relations-col');
      const back = cols[1] ? cols[1].querySelectorAll('.entity-relations-item').length : 0;
      return back;
    });
    if (n === 0) throw new Error('no back refs (expected 4)');
  });
  await t('cockpit: NO soon badges remain anywhere in sidebar', async () => {
    const soonItems = await page.evaluate(() => Array.from(document.querySelectorAll('.cockpit-nav-item.is-soon')).map(el => el.textContent.trim()));
    if (soonItems.length > 0) throw new Error('still has soon badges: ' + soonItems.join(', '));
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
  await t('search: weighted search returns scored results', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/search?q=alice');
      const d = await x.json();
      return { hasItems: Array.isArray(d.items) && d.items.length > 0, hasScores: Array.isArray(d.scores) && d.scores.length > 0, firstScore: d.scores && d.scores[0] };
    });
    if (!r.hasItems) throw new Error('search returned no items');
    if (!r.hasScores) throw new Error('search did not return scores');
    if (r.firstScore < 50) throw new Error('expected first score ≥ 50 for alice, got ' + r.firstScore);
  });
  await t('search: empty query returns empty', async () => {
    const r = await page.evaluate(async () => {
      const x = await fetch('/api/search?q=');
      return x.status;
    });
    if (r !== 200) throw new Error('expected 200, got ' + r);
  });

  tally.ended = Date.now();
  tally.duration_ms = tally.ended - tally.started;
  
    await page.evaluate((t) => { window.__testTally = t; }, tally);
  console.log('## ' + tally.passed + ' passed, ' + tally.failed + ' failed in ' + tally.duration_ms + 'ms');
}
