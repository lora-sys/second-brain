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
  };

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
    return true;
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
        if (window.__renderDashboard) await window.__renderDashboard();
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

  window.__cockpit = { renderShell, renderContent, setActive, nav: { primary: NAV_PRIMARY, resources: NAV_RESOURCES } };
  window.__cockpitAutoBoot = () => {
    try { return new URLSearchParams(location.search).get('cockpit') === '1'; }
    catch { return false; }
  };
})();
