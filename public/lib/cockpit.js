// v0.4.c1 — Cockpit UI module
// Sidebar + multi-pane dashboard layout (Image 3 inspired).
// Activated via ?cockpit=1. Reuses v0.3 render functions by moving their
// target elements (#main, #page-title) into the cockpit shell so existing
// code paths render into the cockpit content area without modification.

(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const NAV_PRIMARY = [
    { hash: '#/dashboard', label: '今日', icon: 'home', impl: 'dashboard' },
    { hash: '#/notes', label: '笔记库', icon: 'note', impl: 'soon' },
    { hash: '#/knowledge', label: '知识图谱', icon: 'graph', impl: 'soon' },
    { hash: '#/tasks', label: '任务', icon: 'check', impl: 'tasks' },
    { hash: '#/schedule', label: '日程', icon: 'calendar', impl: 'soon' },
    { hash: '#/review', label: '回顾', icon: 'eye', impl: 'soon' },
  ];
  const NAV_RESOURCES = [
    { hash: '#/resources', label: '资源库', icon: 'folder', impl: 'links' },
    { hash: '#/templates', label: '模板', icon: 'copy', impl: 'soon' },
    { hash: '#/tags', label: '标签', icon: 'tag', impl: 'tags' },
    { hash: '#/agent', label: '智能体', icon: 'sparkle', impl: 'soon' },
  ];

  const ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>',
    graph: '<circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><path d="M14.5 9.5 17 6.5M9.5 14.5 6.5 17.5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y1="10"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    sparkle: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y1="12"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 4h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4M7 4H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y1="10"/>',
  };

  // -------------------- Today helpers (v0.4.c3) --------------------
  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function isSameDay(iso, dayISO) {
    if (!iso) return false;
    return String(iso).slice(0, 10) === dayISO;
  }
  function escapeAttr(s) {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function pickReflection(state) {
    // "今天想到" — a non-task entity. Prefer recent person / project / link.
    const candidates = [];
    const e = state && state.entities;
    if (e) {
      for (const k of ['person', 'project', 'link']) {
        for (const item of (e[k] || [])) candidates.push({ ...item, _type: k });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const ua = (a.updated || a.data?.updated || '').toString();
      const ub = (b.updated || b.data?.updated || '').toString();
      return ub.localeCompare(ua);
    });
    return candidates[0];
  }
  function todayWins(state) {
    const day = todayISO();
    const tasks = (state && state.entities && state.entities.task) || [];
    return tasks
      .filter((t) => {
        const data = t.data || {};
        const isDone = (data.status === 'done') || (data.status === '已完成');
        return isDone && (isSameDay(data.updated, day) || isSameDay(data.completed, day));
      })
      .slice(0, 5);
  }
  function todayFocus(state) {
    const day = todayISO();
    const tasks = (state && state.entities && state.entities.task) || [];
    return tasks
      .filter((t) => {
        const data = t.data || {};
        const status = data.status || 'open';
        if (status === 'done' || status === '已完成' || status === 'cancelled' || status === '已取消') return false;
        const due = (data.due || '').toString().slice(0, 10);
        return due && due <= day; // due today or overdue
      })
      .slice(0, 5);
  }
  // -------------------- Right rail helpers (v0.4.c4) --------------------
  function parseDateOnly(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function activeTasks(state) {
    const tasks = (state && state.entities && state.entities.task) || [];
    return tasks
      .filter((t) => {
        const s = (t.data && t.data.status) || '';
        return s !== 'done' && s !== '已完成' && s !== 'cancelled' && s !== '已取消';
      })
      .sort((a, b) => {
        // overdue first, then by due date
        const ad = parseDateOnly(a.data && a.data.due) || Infinity;
        const bd = parseDateOnly(b.data && b.data.due) || Infinity;
        return ad - bd;
      })
      .slice(0, 6);
  }
  function upcomingTasks(state) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 7 * 86400000);
    const tasks = (state && state.entities && state.entities.task) || [];
    return tasks
      .map((t) => {
        const d = parseDateOnly(t.data && t.data.due);
        return d ? { t, d } : null;
      })
      .filter((x) => x && x.d >= today && x.d <= horizon)
      .sort((a, b) => a.d - b.d)
      .slice(0, 6)
      .map((x) => x.t);
  }
  function priorityBadge(p) {
    const k = String(p || '').toLowerCase();
    if (k === 'high' || k === '高') return { label: '高', cls: 'priority-high' };
    if (k === 'low' || k === '低') return { label: '低', cls: 'priority-low' };
    return null;
  }
  function renderRightRail(state) {
    const active = activeTasks(state);
    const upcoming = upcomingTasks(state);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const fmtDue = (s) => {
      const d = parseDateOnly(s);
      if (!d) return '';
      const diff = Math.round((d - today) / dayMs);
      if (diff < 0) return '逾期 ' + (-diff) + ' 天';
      if (diff === 0) return '今天';
      if (diff === 1) return '明天';
      return diff + ' 天后';
    };
    const activeHtml = active.length
      ? `<ul class="cockpit-list">${active.map((t) => {
          const pr = priorityBadge(t.data && t.data.priority);
          return `<li>
            <span class="cockpit-list-dot dot-task-overdue"></span>
            <span class="cockpit-list-title">${esc(t.title || t.slug)}</span>
            ${pr ? `<span class="cockpit-list-priority ${pr.cls}">${pr.label}</span>` : ''}
            <span class="cockpit-list-meta">${esc(fmtDue(t.data && t.data.due))}</span>
          </li>`;
        }).join('')}</ul>`
      : `<p class="cockpit-block-empty">没有活跃 task。</p>`;
    const upcomingHtml = upcoming.length
      ? `<ul class="cockpit-list">${upcoming.map((t) => {
          return `<li>
            <span class="cockpit-list-dot"></span>
            <span class="cockpit-list-title">${esc(t.title || t.slug)}</span>
            <span class="cockpit-list-meta">${esc(fmtDue(t.data && t.data.due))}</span>
          </li>`;
        }).join('')}</ul>`
      : `<p class="cockpit-block-empty">未来 7 天没有到期的 task。</p>`;
    return [
      '<aside class="cockpit-rail">',
        '<section class="cockpit-today-block block-active">',
          '<header class="cockpit-block-header">',
            '<span class="cockpit-block-icon">' + icon('bell', 14) + '</span>',
            '<h2 class="cockpit-block-title">任务与提醒</h2>',
            '<span class="cockpit-block-count">' + active.length + '</span>',
          '</header>',
          '<div class="cockpit-block-body">' + activeHtml + '</div>',
        '</section>',
        '<section class="cockpit-today-block block-upcoming">',
          '<header class="cockpit-block-header">',
            '<span class="cockpit-block-icon">' + icon('calendar', 14) + '</span>',
            '<h2 class="cockpit-block-title">即将到来</h2>',
            '<span class="cockpit-block-count">' + upcoming.length + '</span>',
          '</header>',
          '<div class="cockpit-block-body">' + upcomingHtml + '</div>',
        '</section>',
      '</aside>'
    ].join('');
  }

    function renderTodayPanel() {
    const state = (window.__appState) || { entities: { person: [], task: [], project: [], link: [] } };
    const reflection = pickReflection(state);
    const wins = todayWins(state);
    const focus = todayFocus(state);
    const today = new Date();
    const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const emoji = ['📓','🌱','✨','🔮','🪴'][today.getDate() % 5];
    const reflectionHtml = reflection
      ? `<div class="cockpit-reflection">
           <div class="cockpit-reflection-kind">${esc(reflection._type || '')}</div>
           <a class="cockpit-reflection-title" href="#/entity/${escapeAttr(reflection.id)}">${esc(reflection.title || reflection.slug)}</a>
           <p class="cockpit-reflection-hint">${esc((reflection.body || '').slice(0, 80) || '无摘要')}</p>
         </div>`
      : `<p class="cockpit-block-empty">vault 还是空的。今天新建一个 entry 开始吧 →</p>`;
    const winsHtml = wins.length
      ? `<ul class="cockpit-list">${wins.map((t) => `<li><span class="cockpit-list-dot dot-task"></span><span class="cockpit-list-title">${esc(t.title || t.slug)}</span></li>`).join('')}</ul>`
      : `<p class="cockpit-block-empty">今天还没有完成的 task。</p>`;
    const focusHtml = focus.length
      ? `<ul class="cockpit-list">${focus.map((t) => `<li><span class="cockpit-list-dot dot-task-overdue"></span><span class="cockpit-list-title">${esc(t.title || t.slug)}</span><span class="cockpit-list-meta">${esc((t.data && t.data.due) || '')}</span></li>`).join('')}</ul>`
      : `<p class="cockpit-block-empty">今天没有到期的 task。Nice。</p>`;
    return [
      '<div class="cockpit-today">',
        '<header class="cockpit-today-header">',
          '<div class="cockpit-today-emoji">' + emoji + '</div>',
          '<div>',
            '<h1 class="cockpit-today-title">' + esc(dateStr) + '</h1>',
            '<p class="cockpit-today-sub">今日的 「想到 / 成就 / 关注」</p>',
          '</div>',
        '</header>',
        '<div class="cockpit-today-wrap">',
          '<div class="cockpit-today-main">',
        '<section class="cockpit-today-grid">',
          '<article class="cockpit-today-block block-reflection">',
            '<header class="cockpit-block-header">',
              '<span class="cockpit-block-icon">' + icon('star', 14) + '</span>',
              '<h2 class="cockpit-block-title">今日感悟</h2>',
            '</header>',
            '<div class="cockpit-block-body">' + reflectionHtml + '</div>',
          '</article>',
          '<article class="cockpit-today-block block-wins">',
            '<header class="cockpit-block-header">',
              '<span class="cockpit-block-icon">' + icon('trophy', 14) + '</span>',
              '<h2 class="cockpit-block-title">今日成就</h2>',
              '<span class="cockpit-block-count">' + wins.length + '</span>',
            '</header>',
            '<div class="cockpit-block-body">' + winsHtml + '</div>',
          '</article>',
          '<article class="cockpit-today-block block-focus">',
            '<header class="cockpit-block-header">',
              '<span class="cockpit-block-icon">' + icon('target', 14) + '</span>',
              '<h2 class="cockpit-block-title">今日关注</h2>',
              '<span class="cockpit-block-count">' + focus.length + '</span>',
            '</header>',
            '<div class="cockpit-block-body">' + focusHtml + '</div>',
          '</article>',
        '</section>',
          '</div>',
          renderRightRail(state),
        '</div>',
      '</div>'
    ].join('');
  }

  function icon(name, size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function navItem(it) {
    const soon = it.impl === 'soon' ? ' is-soon' : '';
    const badge = it.impl === 'soon' ? '<span class="cockpit-nav-badge">soon</span>' : '';
    return '<div class="cockpit-nav-item' + soon + '" data-hash="' + it.hash + '" data-route="' + it.impl + '">'
      + '<span class="cockpit-nav-icon">' + icon(it.icon, 16) + '</span>'
      + '<span class="cockpit-nav-label">' + esc(it.label) + '</span>'
      + badge + '</div>';
  }

  function navGroup(title, items) {
    return '<div class="cockpit-nav-section">' + esc(title) + '</div>' + items.map(navItem).join('');
  }

  // Track which v3 elements we've moved so renderShell is idempotent.
  let moved = false;
  function adoptV3Elements(overlay) {
    if (moved) return;
    const cockpitContent = overlay.querySelector('#cockpit-content');
    const v3Main = document.getElementById('main');
    if (v3Main && cockpitContent && v3Main.parentElement !== cockpitContent) {
      v3Main.classList.add('cockpit-main-host');
      cockpitContent.appendChild(v3Main);
    }
    const v3PageTitle = document.getElementById('page-title');
    const cockpitTitle = overlay.querySelector('#cockpit-title');
    if (v3PageTitle && cockpitTitle) {
      v3PageTitle.style.display = 'none';
      const sync = () => { cockpitTitle.textContent = v3PageTitle.textContent || cockpitTitle.textContent; };
      new MutationObserver(sync).observe(v3PageTitle, { childList: true, characterData: true, subtree: true });
      sync();
    }
    moved = true;
  }

  function renderShell() {
    if (document.querySelector('.cockpit')) {
      adoptV3Elements(document.querySelector('.cockpit'));
      return true;
    }
    const app = document.querySelector('.app');
    if (!app) return false;
    const vaultPath = (window.__appState && window.__appState.config && window.__appState.config.vaultPath) || '';
    const vaultName = vaultPath.split('/').filter(Boolean).pop() || '未配置';

    app.style.display = 'none';
    document.body.classList.add('cockpit-mode');

    const overlay = document.createElement('div');
    overlay.className = 'cockpit';
    overlay.innerHTML = [
      '<aside class="cockpit-sidebar">',
        '<div class="cockpit-sidebar-brand">',
          '<div class="brand-mark"></div>',
          '<div class="brand-text">第二大脑</div>',
        '</div>',
        '<nav class="cockpit-nav" id="cockpit-nav">',
          navGroup('导航', NAV_PRIMARY),
          navGroup('资源', NAV_RESOURCES),
        '</nav>',
        '<div class="cockpit-sidebar-footer">',
          '<span class="vault-dot"></span>',
          '<span class="cockpit-vault-name">', esc(vaultName), '</span>',
        '</div>',
      '</aside>',
      '<div class="cockpit-main">',
        '<div class="cockpit-topbar">',
          '<h1 class="cockpit-title" id="cockpit-title">今日</h1>',
          '<div class="spacer"></div>',
          '<div class="cockpit-topbar-actions">',
            '<button class="btn btn-ghost btn-sm" data-action="quick-add" title="新建 (N)">', icon('plus', 14), ' 新建</button>',
            '<button class="btn btn-ghost btn-sm" data-action="import-link" title="导入链接">', icon('link', 14), ' 链接</button>',
            '<button class="btn btn-ghost btn-sm" data-action="cmdk" title="命令面板 (⌘K)">⌘K</button>',
            '<button class="btn btn-ghost btn-icon" data-action="theme-toggle" title="切换主题">', icon('eye', 14), '</button>',
          '</div>',
        '</div>',
        '<div class="cockpit-content" id="cockpit-content"></div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    adoptV3Elements(overlay);
    wireShell();
    refreshVaultName();
    return true;
  }

  function refreshVaultName() {
    const el = document.querySelector('.cockpit-vault-name');
    if (!el) return;
    const cfg = window.__appState && window.__appState.config;
    const path = (cfg && cfg.vaultPath) || '';
    el.textContent = path.split('/').filter(Boolean).pop() || '未配置';
  }

  function wireShell() {
    $$('#cockpit-nav .cockpit-nav-item').forEach((el) => {
      el.addEventListener('click', () => {
        const h = el.dataset.hash;
        if (location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'));
        else location.hash = h;
      });
    });
    $$('.cockpit-topbar-actions [data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.action;
        if (a === 'quick-add' && window.openQuickAdd) return window.openQuickAdd();
        if (a === 'import-link' && window.openImportLinkModal) return window.openImportLinkModal();
        if (a === 'cmdk' && window.openCmdK) return window.openCmdK();
        if (a === 'theme-toggle' && window.__toggleTheme) return window.__toggleTheme();
      });
    });
  }

  function setActive(hash) {
    $$('#cockpit-nav .cockpit-nav-item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.hash === hash);
    });
    const map = [].concat(NAV_PRIMARY, NAV_RESOURCES).reduce((m, it) => (m[it.hash] = it.label, m), {});
    const titleEl = document.getElementById('cockpit-title');
    if (titleEl) titleEl.textContent = map[hash] || '第二大脑';
  }

  function placeholder(label, hint) {
    return '<div class="cockpit-placeholder">'
      + '<div class="cockpit-placeholder-icon">' + icon('archive', 28) + '</div>'
      + '<h2 class="cockpit-placeholder-title">' + esc(label) + '</h2>'
      + '<p class="cockpit-placeholder-hint">' + esc(hint) + '</p>'
      + '<p class="cockpit-placeholder-meta">将于 v0.4 后续版本实装。</p>'
      + '</div>';
  }

  async function renderContent(route, hash) {
    const content = document.getElementById('cockpit-content');
    if (!content) return;
    setActive(hash || location.hash || '#/dashboard');
    try {
      if (route === 'dashboard' || route === '' || !route) {
        content.innerHTML = renderTodayPanel();
        return;
      }
      if (route === 'tasks') { if (window.__renderTasks) await window.__renderTasks(); return; }
      if (route === 'links') { if (window.__renderLinks) await window.__renderLinks(); return; }
      if (route === 'tags') {
        if (window.__refreshCounts) { try { await window.__refreshCounts(); } catch {} }
        content.insertAdjacentHTML('beforeend',
          '<div class="cockpit-tags">'
          + '<header class="cockpit-tags-header">'
          + '<h1 class="cockpit-tags-title">标签</h1>'
          + '<p class="cockpit-tags-sub">v0.4.c8 将提供完整的标签管理界面（合并、筛选、保存视图）。</p>'
          + '</header>'
          + '<div class="cockpit-tag-cloud" id="cockpit-tag-cloud"></div>'
          + '</div>');
        return;
      }
      const map = [].concat(NAV_PRIMARY, NAV_RESOURCES).reduce((m, it) => (m[it.impl] = it.label, m), {});
      content.innerHTML = placeholder(map[route] || route, '该模块正在 v0.4 后续 issue 中实现。');
    } catch (err) {
      console.error('[cockpit] renderContent failed:', err);
      content.innerHTML = '<div class="cockpit-error">渲染失败：' + esc(err.message) + '</div>';
    }
  }

  window.__cockpit = { renderShell, renderContent, setActive, refreshVaultName, nav: { primary: NAV_PRIMARY, resources: NAV_RESOURCES } };
  window.__cockpitAutoBoot = () => {
    try { return new URLSearchParams(location.search).get('cockpit') === '1'; }
    catch { return false; }
  };
})();
