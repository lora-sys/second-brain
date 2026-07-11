/* Second Brain Dashboard — vanilla JS single-page app */

(() => {
  'use strict';

  // ====== State ======
  const state = {
    config: null,
    counts: { person: 0, task: 0, project: 0, link: 0 },
    entities: { person: [], task: [], project: [], link: [] },
    current: null, // current entity being viewed
    theme: localStorage.getItem('sb-theme') || 'light',
  };

  // ====== API ======
  const api = {
    async req(path, opts = {}) {
      const res = await fetch(path, {
        headers: { 'content-type': 'application/json' },
        ...opts,
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      return data;
    },
    get(path) { return this.req(path); },
    post(path, body) { return this.req(path, { method: 'POST', body: JSON.stringify(body || {}) }); },
    put(path, body) { return this.req(path, { method: 'PUT', body: JSON.stringify(body || {}) }); },
    del(path) { return this.req(path, { method: 'DELETE' }); },
    config: {
      get: () => api.get('/api/config'),
      put: (body) => api.put('/api/config', body),
    },
    list: (type) => api.get(type ? `/api/entities?type=${type}` : "/api/entities").then(d => d.items),
    read: (id) => api.get(`/api/entities/${encodeURIComponent(id)}`),
    create: (body) => api.post('/api/entities', body),
    update: (id, body) => api.put(`/api/entities/${encodeURIComponent(id)}`, body),
    delete: (id) => api.del(`/api/entities/${encodeURIComponent(id)}`),
    search: (q) => api.get(`/api/search?q=${encodeURIComponent(q)}`),
    dashboard: () => api.get('/api/dashboard'),
    importLink: (body) => api.post('/api/links/import', body),
    lightFetch: (url) => api.post('/api/links/light', { url }),
  };

  // ====== Helpers ======
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (s) => {
    if (!s) return '';
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return s;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch { return s; }
  };
  const fmtDateTime = (s) => {
    if (!s) return '';
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return s;
      return `${fmtDate(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return s; }
  };
  const initials = (s) => {
    const str = String(s || '').trim();
    if (!str) return '?';
    const ch = [...str][0];
    return ch.toUpperCase();
  };
  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  // ====== Toasts ======
  function toast(message, type = 'info') {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  // ====== Modals ======
  function openModal({ title, body, footer, large }) {
    const root = $('#modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-close>
        <div class="modal ${large ? 'modal-large' : ''}">
          <div class="modal-header">
            <h3>${escapeHtml(title)}</h3>
            <button class="modal-close" data-close>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer"></div>
        </div>
      </div>`;
    const bodyEl = $('#modal-body');
    const footerEl = $('#modal-footer');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);
    if (footer) {
      if (typeof footer === 'string') footerEl.innerHTML = footer;
      else if (footer instanceof Node) footerEl.appendChild(footer);
    } else {
      footerEl.remove();
    }
    root.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.modal') && !e.target.matches('[data-close]')) return;
        closeModal();
      });
    });
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  // ====== Markdown rendering with wikilinks ======
  function setupMarked() {
    if (!window.marked) return;
    const renderer = new window.marked.Renderer();
    // marked v14+: link({href, title, tokens}); image({href, title, text})
    renderer.link = function({ href, title, tokens }) {
      const h = String(href || '');
      if (h.startsWith('wikilink:')) {
        const target = decodeURIComponent(h.slice('wikilink:'.length));
        const cls = h.includes('broken') ? 'wikilink wikilink-broken' : 'wikilink';
        const text = this.parser.parseInline(tokens);
        return `<a class="${cls}" data-wikilink="${escapeHtml(target)}" href="#">${text}</a>`;
      }
      const safeHref = String(href || '').replace(/"/g, '&quot;');
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      const text = this.parser.parseInline(tokens);
      return `<a href="${escapeHtml(safeHref)}"${t}>${text}</a>`;
    };
    renderer.image = function({ href, title, text }) {
      const safeHref = String(href || '').replace(/"/g, '&quot;');
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(safeHref)}" alt="${escapeHtml(text || '')}"${t} loading="lazy" />`;
    };
    window.marked.setOptions({ renderer, gfm: true, breaks: false });
  }

  function renderMarkdown(body, opts = {}) {
    if (!body) return '<p class="muted">(无内容)</p>';
    setupMarked();
    // Pre-process wikilinks [[target|label]] or [[target]]
    const pre = body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (m, target, label) => {
      const text = label || target.split('/').pop();
      return `[${text}](wikilink:${encodeURIComponent(target)})`;
    });
    let html = '';
    try {
      html = window.marked.parse(pre);
    } catch (e) {
      console.error('[renderMarkdown] failed:', e.message);
      html = `<pre>${escapeHtml(body)}</pre>`;
    }
    // Wrap embeds - very simple: turn image/video URLs into proper embed blocks.
    html = upgradeEmbeds(html, opts);
    return html;
  }

  function upgradeEmbeds(html, opts = {}) {
    // Promote bare image links to embeds (already inline via <img>).
    // Promote YouTube/Bilibili/Vimeo links to video embeds.
    html = html.replace(/<a href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g, (m, href, text) => {
      if (text.trim() !== href.trim()) return m; // keep as link if text differs
      if (/(?:youtube\.com\/watch\?v=|youtu\.be\/|bilibili\.com\/video\/|vimeo\.com\/\d+)/i.test(href)) {
        return videoEmbedHtml(href);
      }
      return m;
    });
    return html;
  }

  function videoEmbedHtml(url) {
    let embed = '';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (yt) {
      embed = `<iframe src="https://www.youtube.com/embed/${yt[1]}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      const bili = url.match(/bilibili\.com\/video\/([\w]+)/);
      if (bili) {
        embed = `<iframe src="https://player.bilibili.com/player.html?bvid=${bili[1]}" allowfullscreen></iframe>`;
      } else {
        const vimeo = url.match(/vimeo\.com\/(\d+)/);
        if (vimeo) {
          embed = `<iframe src="https://player.vimeo.com/video/${vimeo[1]}" allowfullscreen></iframe>`;
        }
      }
    }
    if (!embed) return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`;
    return `<div class="embed embed-video">${embed}</div>`;
  }

  function linkCardHtml({ title, url, description, cover, site }) {
    const safe = (s) => escapeHtml(s || '');
    const coverHtml = cover
      ? `<img class="embed-link-cover" src="${safe(cover)}" alt="" loading="lazy" onerror="this.style.display='none'"/>`
      : '';
    return `<a class="embed-link" href="${safe(url)}" target="_blank" rel="noopener">
      ${coverHtml}
      <div class="embed-link-body">
        ${site ? `<div class="embed-link-site">${safe(site)}</div>` : ''}
        <div class="embed-link-title">${safe(title || url)}</div>
        ${description ? `<div class="embed-link-desc">${safe(description)}</div>` : ''}
      </div>
    </a>`;
  }

  // ====== Routing ======
  const routes = {
    '': renderDashboard,
    '#/': renderDashboard,
    '#/dashboard': renderDashboard,
    '#/people': renderPeople,
    '#/tasks': renderTasks,
    '#/projects': renderProjects,
    '#/links': renderLinks,
    '#/settings': renderSettings,
  };

  function parseHash() {
    const h = location.hash || '#/';
    if (h.startsWith('#/entity/')) {
      const id = decodeURIComponent(h.slice('#/entity/'.length));
      return { name: 'entity', params: { id } };
    }
    return { name: h.replace(/^#\//, '') || 'dashboard', params: {} };
  }

  async function handleRoute() {
    const r = parseHash();
    const main = $('#main');
    main.innerHTML = '<div class="empty"><div class="spinner"></div></div>';
    try {
      // Refresh counts for sidebar.
      await refreshCounts();
      if (r.name === 'entity') {
        await renderEntity(r.params.id);
      } else {
        const fn = routes['#/' + r.name] || routes[''];
        await fn();
      }
      updateSidebarActive();
    } catch (err) {
      main.innerHTML = `<div class="empty"><h3>出错</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  window.addEventListener('hashchange', handleRoute);

  // ====== Sidebar ======
  function renderSidebar() {
    const nav = $('#nav-list');
    const items = [
      { hash: '#/dashboard', label: '仪表盘', icon: 'home' },
      { hash: '#/people', label: '人物', icon: 'user', count: state.counts.person },
      { hash: '#/tasks', label: '任务', icon: 'check', count: state.counts.task },
      { hash: '#/projects', label: '项目', icon: 'folder', count: state.counts.project },
      { hash: '#/links', label: '链接', icon: 'link', count: state.counts.link },
    ];
    nav.innerHTML = `
      <div class="nav-section">导航</div>
      ${items.map((it) => `
        <div class="nav-link" data-hash="${it.hash}">
          ${iconSvg(it.icon)}
          <span>${it.label}</span>
          ${it.count != null ? `<span class="nav-count">${it.count}</span>` : ''}
        </div>
      `).join('')}
      <div class="nav-section" style="margin-top:18px">系统</div>
      <div class="nav-link" data-hash="#/settings">
        ${iconSvg('settings')}
        <span>设置</span>
      </div>
    `;
    nav.querySelectorAll('.nav-link').forEach((el) => {
      el.addEventListener('click', () => {
        location.hash = el.dataset.hash;
      });
    });
    if (state.config?.vaultPath) {
      const v = state.config.vaultPath.split('/').filter(Boolean).pop() || state.config.vaultPath;
      $('#vault-name').textContent = `📁 ${v}`;
    }
  }

  function updateSidebarActive() {
    const hash = location.hash || '#/';
    $$('.nav-link').forEach((el) => {
      el.classList.toggle('active', el.dataset.hash === hash || (hash.startsWith('#/entity/') && el.dataset.hash.startsWith('#/')));
    });
  }

  async function refreshCounts() {
    try {
      const dash = await api.dashboard();
      state.counts = dash.counts;
      state.tasksByStatus = dash.tasksByStatus;
      state.dueTasks = dash.dueTasks;
      state.recent = dash.recent;
      state.tags = dash.tags;
      renderSidebar();
    } catch (err) {
      if (err.message.includes('Vault not configured')) {
        location.hash = '#/settings';
        throw err;
      }
      console.warn('refreshCounts failed', err);
    }
  }

  // ====== Icons ======
  const ICONS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6 17.5 20a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  };
  function iconSvg(name, size = 16) {
    const path = ICONS[name] || '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  // ====== Page: Dashboard ======
  async function renderDashboard() {
    $('#page-title').textContent = '仪表盘';
    const dash = state; // we just refreshed
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>你好 👋</h2>
          <div class="subtitle">这是你的第二大脑，所有内容都同步到 Obsidian 仓库。</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" data-action="quick-add">${iconSvg('plus')} 新建</button>
        </div>
      </div>

      <div class="dash-grid">
        <div class="stat-card">
          <div class="stat-label">人物</div>
          <div class="stat-value">${state.counts.person || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务</div>
          <div class="stat-value">${state.counts.task || 0}</div>
          <div class="text-faint" style="font-size: 12px; margin-top: 4px;">
            待办 ${state.tasksByStatus?.todo || 0} · 进行 ${state.tasksByStatus?.in_progress || 0} · 完成 ${state.tasksByStatus?.done || 0}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">项目</div>
          <div class="stat-value">${state.counts.project || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">链接</div>
          <div class="stat-value">${state.counts.link || 0}</div>
        </div>
      </div>

      <div class="dash-section">
        <h3>即将到期</h3>
        ${state.dueTasks?.length ? renderTaskListRows(state.dueTasks) : '<div class="muted">没有即将到期的任务</div>'}
      </div>

      <div class="dash-section">
        <h3>最近编辑</h3>
        ${state.recent?.length ? renderRecentList(state.recent) : '<div class="muted">还没有任何记录</div>'}
      </div>

      <div class="dash-section">
        <h3>常用标签</h3>
        ${renderTagCloud(state.tags)}
      </div>
    `;

    main.querySelector('[data-action="quick-add"]').addEventListener('click', openQuickAdd);
    attachRowHandlers(main);
  }

  function renderTaskListRows(tasks) {
    return `<div class="grid">${tasks.map((t) => `
      <div class="card" data-entity-id="${escapeHtml(t.id)}">
        <div class="card-title">${escapeHtml(t.data.title || t.slug)}</div>
        <div class="card-meta">
          <span class="status status-${escapeHtml(t.data.status || 'todo')}">${statusLabel(t.data.status)}</span>
          <span class="priority-${escapeHtml(t.data.priority || 'medium')}">${priorityLabel(t.data.priority)}</span>
          ${t.data.due ? `<span>${iconSvg('calendar', 12)} ${escapeHtml(t.data.due)}</span>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  function renderRecentList(items) {
    return `<div class="grid">${items.slice(0, 8).map((e) => `
      <div class="card" data-entity-id="${escapeHtml(e.id)}">
        <div class="card-meta"><span>${typeLabel(e.type)}</span><span>${fmtDateTime(e.data.updated)}</span></div>
        <div class="card-title">${escapeHtml(e.data.title || e.data.name || e.slug)}</div>
        ${e.data.description ? `<div class="card-body">${escapeHtml(e.data.description)}</div>` : ''}
      </div>`).join('')}</div>`;
  }

  function renderTagCloud(tags) {
    const entries = Object.entries(tags || {}).sort((a, b) => b[1] - a[1]).slice(0, 24);
    if (!entries.length) return '<div class="muted">还没有标签</div>';
    return `<div class="tag-row">${entries.map(([t, n]) => `<span class="tag">#${escapeHtml(t)} <span class="text-faint">${n}</span></span>`).join('')}</div>`;
  }

  // ====== Page: People ======
  async function renderPeople() {
    $('#page-title').textContent = '人物';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>人物</h2>
          <div class="subtitle">记录我认识的人，以及他们与项目/任务的联系。</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" data-action="new-person">${iconSvg('plus')} 新增人物</button>
        </div>
      </div>
      <div id="people-list"></div>
    `;
    const items = await api.list('person');
    state.entities.person = items;
    const list = $('#people-list');
    if (!items.length) {
      list.innerHTML = `<div class="empty"><h3>还没有人物</h3><p>点击右上角新增你的第一个人物卡片。</p></div>`;
    } else {
      list.innerHTML = `<div class="grid">${items.map(personCardHtml).join('')}</div>`;
    }
    main.querySelector('[data-action="new-person"]').addEventListener('click', () => openEntityModal('person'));
    attachRowHandlers(list);
  }

  function personCardHtml(p) {
    const name = p.data.name || p.slug;
    return `<div class="card" data-entity-id="${escapeHtml(p.id)}">
      <div style="display:flex; gap:10px; align-items:center;">
        <div class="detail-avatar" style="width:38px;height:38px;font-size:15px;border-radius:10px;">${escapeHtml(initials(name))}</div>
        <div style="flex:1; min-width:0;">
          <div class="card-title">${escapeHtml(name)}</div>
          <div class="card-meta">
            ${p.data.status ? `<span class="status status-${escapeHtml(p.data.status)}">${statusLabel(p.data.status)}</span>` : ''}
            ${p.data.met ? `<span>${iconSvg('calendar', 12)} ${escapeHtml(p.data.met)}</span>` : ''}
          </div>
        </div>
      </div>
      ${renderTagRow(p.data.tags)}
    </div>`;
  }

  // ====== Page: Tasks (kanban) ======
  async function renderTasks() {
    $('#page-title').textContent = '任务';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>任务</h2>
          <div class="subtitle">看板视图：待办 / 进行中 / 已完成 / 已取消</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" data-action="new-task">${iconSvg('plus')} 新建任务</button>
        </div>
      </div>
      <div class="kanban" id="kanban"></div>
    `;
    const items = await api.list('task');
    state.entities.task = items;
    const columns = [
      { id: 'todo', title: '待办', items: [] },
      { id: 'in_progress', title: '进行中', items: [] },
      { id: 'done', title: '已完成', items: [] },
      { id: 'cancelled', title: '已取消', items: [] },
    ];
    for (const t of items) {
      const col = columns.find((c) => c.id === (t.data.status || 'todo')) || columns[0];
      col.items.push(t);
    }
    for (const col of columns) col.items.sort((a, b) => (a.data.due || 'z').localeCompare(b.data.due || 'z'));

    const kanban = $('#kanban');
    kanban.innerHTML = columns.map((col) => `
      <div class="kanban-col" data-status="${col.id}">
        <h3>${escapeHtml(col.title)} <span class="kanban-col-count">${col.items.length}</span></h3>
        ${col.items.length === 0
          ? `<div class="kanban-empty">— 空白 —</div>`
          : col.items.map(taskCardHtml).join('')}
      </div>
    `).join('');
    main.querySelector('[data-action="new-task"]').addEventListener('click', () => openEntityModal('task'));
    attachRowHandlers(kanban);
  }

  function taskCardHtml(t) {
    const overdue = t.data.due && new Date(t.data.due) < new Date() && t.data.status !== 'done' && t.data.status !== 'cancelled';
    return `<div class="kanban-card" data-entity-id="${escapeHtml(t.id)}">
      <div class="kanban-card-title">${escapeHtml(t.data.title || t.slug)}</div>
      <div class="kanban-card-meta">
        <span class="priority-${escapeHtml(t.data.priority || 'medium')}">${priorityLabel(t.data.priority)}</span>
        ${t.data.due ? `<span style="color:${overdue ? 'var(--danger)' : 'inherit'}">${iconSvg('calendar', 11)} ${escapeHtml(t.data.due)}</span>` : ''}
      </div>
      ${renderTagRow(t.data.tags)}
    </div>`;
  }

  // ====== Page: Projects ======
  async function renderProjects() {
    $('#page-title').textContent = '项目';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>项目</h2>
          <div class="subtitle">主题、目标、相关人物/任务/链接都集中在这里。</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" data-action="new-project">${iconSvg('plus')} 新建项目</button>
        </div>
      </div>
      <div id="projects-list"></div>
    `;
    const items = await api.list('project');
    state.entities.project = items;
    const list = $('#projects-list');
    if (!items.length) {
      list.innerHTML = `<div class="empty"><h3>还没有项目</h3><p>创建一个项目，把相关的任务、链接、人串起来。</p></div>`;
    } else {
      list.innerHTML = `<div class="grid">${items.map(projectCardHtml).join('')}</div>`;
    }
    main.querySelector('[data-action="new-project"]').addEventListener('click', () => openEntityModal('project'));
    attachRowHandlers(list);
  }

  function projectCardHtml(p) {
    return `<div class="card" data-entity-id="${escapeHtml(p.id)}">
      <div class="card-meta"><span>${typeLabel('project')}</span><span>${fmtDate(p.data.updated)}</span></div>
      <div class="card-title">${escapeHtml(p.data.title || p.slug)}</div>
      ${p.data.description ? `<div class="card-body">${escapeHtml(p.data.description)}</div>` : ''}
      ${renderTagRow(p.data.tags)}
    </div>`;
  }

  // ====== Page: Links ======
  async function renderLinks() {
    $('#page-title').textContent = '链接';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>链接</h2>
          <div class="subtitle">从外部导入的文章/视频/资料，可以离线阅读。</div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" data-action="import-link">${iconSvg('plus')} 导入链接</button>
        </div>
      </div>
      <div id="links-list"></div>
    `;
    const items = await api.list('link');
    state.entities.link = items;
    const list = $('#links-list');
    if (!items.length) {
      list.innerHTML = `<div class="empty"><h3>还没有链接</h3><p>粘贴一个 URL，抓取后会作为卡片保存。</p></div>`;
    } else {
      list.innerHTML = `<div class="grid">${items.map(linkCardItemHtml).join('')}</div>`;
    }
    main.querySelector('[data-action="import-link"]').addEventListener('click', openImportLinkModal);
    attachRowHandlers(list);
  }

  function linkCardItemHtml(l) {
    const cover = l.data.cover ? `<img class="card-cover" src="${escapeHtml(l.data.cover)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : '';
    return `<div class="card" data-entity-id="${escapeHtml(l.id)}">
      ${cover}
      <div class="card-meta">
        ${l.data.site ? `<span>${escapeHtml(l.data.site)}</span>` : ''}
        <span>${l.data.fetchMode === 'deep' ? '深度抓取' : '轻量'}</span>
      </div>
      <div class="card-title">${escapeHtml(l.data.title || l.slug)}</div>
      ${l.data.description ? `<div class="card-body">${escapeHtml(l.data.description)}</div>` : ''}
      ${renderTagRow(l.data.tags)}
    </div>`;
  }

  // ====== Page: Settings ======
  async function renderSettings() {
    $('#page-title').textContent = '设置';
    const cfg = await api.config.get();
    state.config = cfg;
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header"><h2>设置</h2></div>
      <div class="editor" style="max-width:640px;">
        <div class="editor-row">
          <label>Vault 路径</label>
          <input id="cfg-vault" type="text" value="${escapeHtml(cfg.vaultPath || '')}" placeholder="/path/to/Obsidian Vault" />
        </div>
        <div class="editor-row">
          <label>监听端口</label>
          <input id="cfg-port" type="number" value="${cfg.port || 3939}" />
        </div>
        <div class="editor-row">
          <label>监听地址</label>
          <input id="cfg-host" type="text" value="${escapeHtml(cfg.host || '127.0.0.1')}" />
        </div>
        <div class="hr"></div>
        <h3 style="margin: 0 0 8px; font-size: 14px;">目录命名（相对 Vault 根）</h3>
        <div class="editor-row"><label>人物</label><input id="cfg-dir-person" type="text" value="${escapeHtml(cfg.directories.person || '')}" /></div>
        <div class="editor-row"><label>任务</label><input id="cfg-dir-task" type="text" value="${escapeHtml(cfg.directories.task || '')}" /></div>
        <div class="editor-row"><label>项目</label><input id="cfg-dir-project" type="text" value="${escapeHtml(cfg.directories.project || '')}" /></div>
        <div class="editor-row"><label>链接</label><input id="cfg-dir-link" type="text" value="${escapeHtml(cfg.directories.link || '')}" /></div>
        <div class="editor-row"><label>仪表盘</label><input id="cfg-dir-dashboard" type="text" value="${escapeHtml(cfg.directories.dashboard || '')}" /></div>
        <div class="editor-row" style="justify-content:flex-end;">
          <button class="btn" data-action="cancel">取消</button>
          <button class="btn btn-primary" data-action="save">保存</button>
        </div>
        <div class="hr"></div>
        <h3 style="margin: 0 0 8px; font-size: 14px;">关于</h3>
        <p class="muted">
          所有内容都以 Markdown 文件形式存储在你的 Obsidian Vault 中。
          这是 source of truth —— 在 Obsidian 里直接修改文件，刷新页面即可看到更新。
        </p>
      </div>
    `;
    main.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const body = {
        vaultPath: $('#cfg-vault').value.trim(),
        port: Number($('#cfg-port').value),
        host: $('#cfg-host').value.trim(),
        directories: {
          person: $('#cfg-dir-person').value.trim(),
          task: $('#cfg-dir-task').value.trim(),
          project: $('#cfg-dir-project').value.trim(),
          link: $('#cfg-dir-link').value.trim(),
          dashboard: $('#cfg-dir-dashboard').value.trim(),
        },
      };
      try {
        const next = await api.config.put(body);
        state.config = next;
        toast('已保存。重启服务器后端口/地址生效。', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  // ====== Quick add ======
  function openQuickAdd() {
    const html = `
      <div class="editor">
        <div class="editor-row"><label>类型</label>
          <select id="qa-type">
            <option value="task">任务</option>
            <option value="person">人物</option>
            <option value="project">项目</option>
            <option value="link">链接</option>
          </select>
        </div>
        <div class="editor-row"><label>标题</label><input id="qa-title" placeholder="输入标题…" /></div>
      </div>`;
    openModal({
      title: '快速新建',
      body: html,
      footer: `<button class="btn" data-close>取消</button><button class="btn btn-primary" id="qa-submit">创建</button>`,
    });
    $('#qa-submit').addEventListener('click', async () => {
      const type = $('#qa-type').value;
      const title = $('#qa-title').value.trim();
      if (!title) { toast('请输入标题', 'error'); return; }
      try {
        await api.create({ type, title });
        toast('已创建', 'success');
        closeModal();
        handleRoute();
      } catch (err) { toast(err.message, 'error'); }
    });
    setTimeout(() => $('#qa-title').focus(), 50);
  }

  // ====== Entity modal (create/edit) ======
  function openEntityModal(type, existing) {
    const isEdit = !!existing;
    const d = existing?.data || {};
    const fields = fieldsFor(type);
    const formHtml = `
      <div class="editor">
        <div class="editor-row">
          <label>${type === 'person' ? '姓名' : '标题'}</label>
          <input id="f-title" value="${escapeHtml((d.name || d.title || '') + '')}" />
        </div>
        ${fields.map((f) => fieldHtml(f, d[f.key])).join('')}
        <div class="editor-row" style="align-items:flex-start;">
          <label>正文</label>
          <textarea id="f-body" placeholder="支持 Markdown，使用 [[人物/张三]] 或 [[项目-名]] 交叉引用">${escapeHtml(existing?.body || '')}</textarea>
        </div>
        <div class="muted" style="text-align:right;">
          ${isEdit ? `最后更新：${fmtDateTime(d.updated)}` : ''}
        </div>
      </div>`;
    openModal({
      title: `${isEdit ? '编辑' : '新建'} ${typeLabel(type)}`,
      body: formHtml,
      footer: isEdit
        ? `<button class="btn btn-danger" id="f-delete">删除</button>
           <button class="btn" data-close>取消</button>
           <button class="btn btn-primary" id="f-save">保存</button>`
        : `<button class="btn" data-close>取消</button>
           <button class="btn btn-primary" id="f-save">创建</button>`,
    });

    $('#f-save').addEventListener('click', async () => {
      const title = $('#f-title').value.trim();
      if (!title) { toast('请填写标题/姓名', 'error'); return; }
      const data = { ...d };
      const body = $('#f-body').value;
      if (type === 'person') data.name = title;
      else data.title = title;
      for (const f of fields) {
        const el = $('#f-' + f.key);
        if (!el) continue;
        const val = readFieldValue(f, el);
        if (val === '' || (Array.isArray(val) && val.length === 0)) {
          delete data[f.key];
        } else {
          data[f.key] = val;
        }
      }
      try {
        if (isEdit) {
          await api.update(existing.id, { data, body });
        } else {
          await api.create({ type, title, data, body });
        }
        toast(isEdit ? '已保存' : '已创建', 'success');
        closeModal();
        if (isEdit) {
          location.hash = `#/entity/${encodeURIComponent(existing.id)}`;
        } else {
          handleRoute();
        }
      } catch (err) { toast(err.message, 'error'); }
    });
    if (isEdit) {
      $('#f-delete').addEventListener('click', async () => {
        if (!confirm('确定删除？此操作会从 Obsidian Vault 移除对应 .md 文件。')) return;
        try {
          await api.delete(existing.id);
          toast('已删除', 'success');
          closeModal();
          history.back();
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  }

  function fieldsFor(type) {
    if (type === 'person') return [
      { key: 'status', label: '状态', kind: 'select', options: [
        { value: 'active', label: '活跃' },
        { value: 'dormant', label: '久未联系' },
        { value: 'archived', label: '已归档' },
      ] },
      { key: 'met', label: '认识于', kind: 'date' },
      { key: 'company', label: '公司 / 团队', kind: 'text' },
      { key: 'role', label: '角色 / 头衔', kind: 'text' },
      { key: 'contact', label: '联系方式', kind: 'object', fields: [
        { key: 'email', label: '邮箱' },
        { key: 'phone', label: '电话' },
        { key: 'wechat', label: '微信' },
      ] },
      { key: 'social', label: '社交账号', kind: 'object', fields: [
        { key: 'github', label: 'GitHub' },
        { key: 'twitter', label: 'Twitter / X' },
        { key: 'linkedin', label: 'LinkedIn' },
        { key: 'website', label: '个人站' },
      ] },
      { key: 'tags', label: '标签', kind: 'tags' },
    ];
    if (type === 'task') return [
      { key: 'status', label: '状态', kind: 'select', options: [
        { value: 'todo', label: '待办' },
        { value: 'in_progress', label: '进行中' },
        { value: 'done', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ] },
      { key: 'priority', label: '优先级', kind: 'select', options: [
        { value: 'low', label: '低' },
        { value: 'medium', label: '中' },
        { value: 'high', label: '高' },
      ] },
      { key: 'due', label: '截止日期', kind: 'date' },
      { key: 'project', label: '所属项目', kind: 'entity-ref', refType: 'project' },
      { key: 'tags', label: '标签', kind: 'tags' },
    ];
    if (type === 'project') return [
      { key: 'status', label: '状态', kind: 'select', options: [
        { value: 'active', label: '进行中' },
        { value: 'paused', label: '暂停' },
        { value: 'done', label: '已完成' },
        { value: 'archived', label: '归档' },
      ] },
      { key: 'description', label: '一句话简介', kind: 'textarea' },
      { key: 'startDate', label: '开始日期', kind: 'date' },
      { key: 'tags', label: '标签', kind: 'tags' },
    ];
    if (type === 'link') return [
      { key: 'url', label: 'URL', kind: 'text' },
      { key: 'site', label: '站点', kind: 'text' },
      { key: 'description', label: '描述', kind: 'textarea' },
      { key: 'tags', label: '标签', kind: 'tags' },
    ];
    return [];
  }

  function fieldHtml(f, value) {
    const v = value == null ? '' : value;
    const id = 'f-' + f.key;
    let inner = '';
    if (f.kind === 'text') {
      inner = `<input id="${id}" type="text" value="${escapeHtml(v)}" />`;
    } else if (f.kind === 'textarea') {
      inner = `<textarea id="${id}" rows="2">${escapeHtml(v)}</textarea>`;
    } else if (f.kind === 'date') {
      inner = `<input id="${id}" type="date" value="${escapeHtml(typeof v === 'string' ? v.slice(0, 10) : '')}" />`;
    } else if (f.kind === 'select') {
      inner = `<select id="${id}">
        ${f.options.map((o) => `<option value="${escapeHtml(o.value)}" ${v === o.value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
      </select>`;
    } else if (f.kind === 'tags') {
      const arr = Array.isArray(v) ? v : [];
      inner = `<input id="${id}" type="text" value="${escapeHtml(arr.join(', '))}" placeholder="逗号分隔，例如：阅读, 重要" />`;
    } else if (f.kind === 'object') {
      const obj = (v && typeof v === 'object') ? v : {};
      inner = `<div style="flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        ${f.fields.map((sub) => `
          <div class="editor-row" style="margin:0;">
            <input id="${id}-${sub.key}" type="text" placeholder="${escapeHtml(sub.label)}" value="${escapeHtml(obj[sub.key] || '')}" />
          </div>`).join('')}
      </div>`;
    } else if (f.kind === 'entity-ref') {
      const refVal = typeof v === 'string' ? v.replace(/^\[\[|\]\]$/g, '') : '';
      inner = `<input id="${id}" type="text" value="${escapeHtml(refVal)}" placeholder="项目 slug，例如 my-second-brain" />`;
    }
    return `<div class="editor-row"><label>${escapeHtml(f.label)}</label>${inner}</div>`;
  }

  function readFieldValue(f, el) {
    if (!el) return '';
    if (f.kind === 'tags') {
      return el.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    }
    if (f.kind === 'object') {
      const obj = {};
      for (const sub of f.fields) {
        const v = $('#' + el.id + '-' + sub.key)?.value?.trim();
        if (v) obj[sub.key] = v;
      }
      return Object.keys(obj).length ? obj : '';
    }
    return el.value;
  }

  // ====== Import link modal ======
  function openImportLinkModal() {
    const html = `
      <div class="editor">
        <div class="editor-row"><label>URL</label><input id="imp-url" placeholder="https://..." /></div>
        <div class="editor-row"><label>标题（可选）</label><input id="imp-title" placeholder="留空则自动获取页面标题" /></div>
        <div class="editor-row"><label>标签</label><input id="imp-tags" placeholder="逗号分隔" /></div>
        <div class="editor-row" style="align-items:flex-start;">
          <label>抓取方式</label>
          <div style="flex:1;">
            <label style="display:flex; gap:6px; align-items:center; padding:6px 0;">
              <input type="radio" name="imp-mode" value="light" checked />
              <span>轻量（仅元信息 + 封面）</span>
            </label>
            <label style="display:flex; gap:6px; align-items:center; padding:6px 0;">
              <input type="radio" name="imp-mode" value="deep" />
              <span>深度抓取（提取正文 → Markdown，离线可读）</span>
            </label>
          </div>
        </div>
        <div id="imp-preview" class="muted"></div>
      </div>`;
    openModal({
      title: '导入链接',
      body: html,
      footer: `<button class="btn" data-close>取消</button>
               <button class="btn btn-primary" id="imp-go">抓取并保存</button>`,
    });
    $('#imp-go').addEventListener('click', async () => {
      const url = $('#imp-url').value.trim();
      const title = $('#imp-title').value.trim();
      const tags = $('#imp-tags').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      const deep = document.querySelector('input[name="imp-mode"]:checked').value === 'deep';
      if (!url) { toast('请填写 URL', 'error'); return; }
      const btn = $('#imp-go');
      btn.disabled = true;
      btn.textContent = '抓取中…';
      try {
        const result = await api.importLink({ url, title, tags, deep });
        if (result.data?.fetchStatus === 'failed') {
          toast('已保存（抓取失败，可在 Obsidian 中补全）', 'success');
        } else {
          toast('已保存', 'success');
        }
        closeModal();
        location.hash = `#/entity/${encodeURIComponent(result.id)}`;
      } catch (err) { toast(err.message, 'error'); }
      btn.disabled = false;
      btn.textContent = '抓取并保存';
    });
  }

  // ====== Entity detail page ======
  async function renderEntity(id) {
    let entity;
    try { entity = await api.read(id); } catch (err) {
      $('#page-title').textContent = '未找到';
      $('#main').innerHTML = `<div class="empty"><h3>未找到</h3><p>${escapeHtml(err.message)}</p><p><a href="#/dashboard">返回仪表盘</a></p></div>`;
      return;
    }
    state.current = entity;
    $('#page-title').textContent = entity.data.title || entity.data.name || entity.slug;
    const main = $('#main');
    main.innerHTML = `
      <div class="detail">
        <div class="detail-header">
          <div class="detail-avatar">${escapeHtml(initials(entity.data.name || entity.data.title || entity.slug))}</div>
          <div style="flex:1; min-width:0;">
            <h2 class="detail-title">${escapeHtml(entity.data.title || entity.data.name || entity.slug)}</h2>
            <div class="detail-meta">
              ${typeLabel(entity.type)}
              ${entity.data.status ? `<span class="status status-${escapeHtml(entity.data.status)}">${statusLabel(entity.data.status)}</span>` : ''}
              ${entity.data.priority ? `<span class="priority-${escapeHtml(entity.data.priority)}">${priorityLabel(entity.data.priority)}</span>` : ''}
              ${entity.data.due ? `<span>${iconSvg('calendar', 12)} ${escapeHtml(entity.data.due)}</span>` : ''}
              ${entity.data.url ? `<a href="${escapeHtml(entity.data.url)}" target="_blank" rel="noopener">${escapeHtml(shortUrl(entity.data.url))}</a>` : ''}
              ${renderTagRow(entity.data.tags)}
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn" data-action="edit">${iconSvg('edit')} 编辑</button>
          </div>
        </div>
        ${renderEntityFields(entity)}
        ${renderEntityEmbed(entity)}
        ${entity.body ? `<div class="markdown">${renderMarkdown(entity.body)}</div>` : ''}
        ${renderEntityRelations(entity)}
      </div>
    `;
    main.querySelector('[data-action="edit"]').addEventListener('click', () => openEntityModal(entity.type, entity));
    bindWikilinks(main);
  }

  function renderEntityFields(entity) {
    const d = entity.data;
    if (entity.type === 'person') {
      const c = d.contact || {};
      const s = d.social || {};
      return `<div class="field-grid">
        ${fieldCard('公司', d.company)}${fieldCard('角色', d.role)}
        ${fieldCard('认识于', d.met)}${fieldCard('状态', statusLabel(d.status))}
        ${fieldCard('邮箱', c.email ? `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>` : '')}
        ${fieldCard('电话', c.phone)}${fieldCard('微信', c.wechat)}
        ${fieldCard('GitHub', s.github ? `<a href="${escapeHtml(socialUrl('github', s.github))}" target="_blank" rel="noopener">${escapeHtml(s.github)}</a>` : '')}
        ${fieldCard('Twitter', s.twitter ? `<a href="${escapeHtml(socialUrl('twitter', s.twitter))}" target="_blank" rel="noopener">${escapeHtml(s.twitter)}</a>` : '')}
        ${fieldCard('LinkedIn', s.linkedin ? `<a href="${escapeHtml(socialUrl('linkedin', s.linkedin))}" target="_blank" rel="noopener">${escapeHtml(s.linkedin)}</a>` : '')}
        ${fieldCard('个人站', s.website ? `<a href="${escapeHtml(s.website)}" target="_blank" rel="noopener">${escapeHtml(s.website)}</a>` : '')}
      </div>`;
    }
    if (entity.type === 'task') {
      return `<div class="field-grid">
        ${fieldCard('状态', statusLabel(d.status))}
        ${fieldCard('优先级', priorityLabel(d.priority))}
        ${fieldCard('截止日期', d.due)}
        ${fieldCard('所属项目', d.project ? escapeHtml(d.project) : '')}
        ${fieldCard('创建', fmtDateTime(d.created))}
        ${fieldCard('更新', fmtDateTime(d.updated))}
      </div>`;
    }
    if (entity.type === 'project') {
      return `<div class="field-grid">
        ${fieldCard('状态', statusLabel(d.status))}
        ${fieldCard('开始日期', d.startDate)}
        ${fieldCard('描述', d.description)}
        ${fieldCard('创建', fmtDateTime(d.created))}
        ${fieldCard('更新', fmtDateTime(d.updated))}
      </div>`;
    }
    if (entity.type === 'link') {
      return `<div class="field-grid">
        ${fieldCard('站点', d.site)}
        ${fieldCard('抓取方式', d.fetchMode === 'deep' ? '深度抓取' : '轻量')}
        ${fieldCard('抓取时间', fmtDateTime(d.fetchedAt))}
        ${fieldCard('原始 URL', d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(d.url)}</a>` : '')}
      </div>`;
    }
    return '';
  }

  function fieldCard(label, value) {
    const isEmpty = value == null || value === '';
    return `<div class="field">
      <div class="field-label">${escapeHtml(label)}</div>
      <div class="field-value ${isEmpty ? 'empty' : ''}">${isEmpty ? '—' : value}</div>
    </div>`;
  }

  function renderEntityEmbed(entity) {
    if (entity.type !== 'link') return '';
    const d = entity.data;
    const previewHtml = linkCardHtml({
      title: d.title,
      url: d.url,
      description: d.description,
      cover: d.cover,
      site: d.site,
    });
    return `<div class="embed">${previewHtml}</div>`;
  }

  function renderEntityRelations(entity) {
    // Find related items via wikilinks in body.
    if (!entity.body) return '';
    const refs = [...entity.body.matchAll(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g)].map((m) => m[1]);
    if (!refs.length) return '';
    return `<div class="dash-section" style="margin-top: 28px;">
      <h3>交叉引用</h3>
      <div class="muted">${refs.length} 处引用，渲染时已尝试解析。</div>
    </div>`;
  }

  // ====== Wikilink clicks ======
  function bindWikilinks(root) {
    root.querySelectorAll('[data-wikilink]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.dataset.wikilink;
        // Open existing entity by id if format is "dir/slug"
        if (target.includes('/')) {
          location.hash = `#/entity/${encodeURIComponent(target)}`;
        } else {
          // Try as slug across all types
          for (const t of ['person', 'task', 'project', 'link']) {
            location.hash = `#/entity/${encodeURIComponent(state.config.directories[t] + '/' + target)}`;
            return;
          }
        }
      });
    });
  }

  // ====== Shared render helpers ======
  function renderTagRow(tags) {
    if (!tags || !tags.length) return '';
    return `<div class="tag-row" style="margin-top:8px;">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>`;
  }
  function statusLabel(s) {
    return ({ todo: '待办', in_progress: '进行中', done: '已完成', cancelled: '已取消',
              active: '活跃', dormant: '久未联系', archived: '已归档', paused: '暂停' })[s] || s || '';
  }
  function priorityLabel(p) {
    return ({ low: '低', medium: '中', high: '高' })[p] || p || '';
  }
  function typeLabel(t) {
    return ({ person: '人物', task: '任务', project: '项目', link: '链接' })[t] || t;
  }
  function shortUrl(u) { return String(u).replace(/^https?:\/\//, '').slice(0, 40); }
  function socialUrl(kind, v) {
    const s = String(v).trim().replace(/^@/, '');
    if (/^https?:\/\//.test(s)) return s;
    if (kind === 'github') return `https://github.com/${s}`;
    if (kind === 'twitter') return `https://x.com/${s}`;
    if (kind === 'linkedin') return `https://www.linkedin.com/in/${s}`;
    return s;
  }

  function attachRowHandlers(root) {
    root.querySelectorAll('[data-entity-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.entityId;
        location.hash = `#/entity/${encodeURIComponent(id)}`;
      });
    });
  }

  // ====== Search ======
  function setupSearch() {
    const input = $('#search-input');
    const results = $('#search-results');
    const run = debounce(async () => {
      const q = input.value.trim();
      if (!q) { results.classList.add('hidden'); return; }
      try {
        const { items } = await api.search(q);
        if (!items.length) {
          results.innerHTML = `<div class="search-result"><div class="search-result-meta">无结果</div></div>`;
        } else {
          results.innerHTML = items.slice(0, 12).map((it) => `
            <div class="search-result" data-id="${escapeHtml(it.id)}">
              <div class="search-result-title">${escapeHtml(it.data.title || it.data.name || it.slug)}</div>
              <div class="search-result-meta">${typeLabel(it.type)} · ${escapeHtml(it.data.status || '')} · ${fmtDateTime(it.data.updated)}</div>
            </div>`).join('');
        }
        results.classList.remove('hidden');
        results.querySelectorAll('.search-result[data-id]').forEach((r) => {
          r.addEventListener('click', () => {
            location.hash = `#/entity/${encodeURIComponent(r.dataset.id)}`;
            input.value = '';
            results.classList.add('hidden');
          });
        });
      } catch (err) { /* ignore */ }
    }, 200);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (input.value) run(); });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search')) results.classList.add('hidden');
    });
  }

  // ====== Theme ======
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem('sb-theme', state.theme);
  }
  function setupTheme() {
    applyTheme();
    $('#theme-toggle').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
    });
  }

  // ====== Bootstrap ======
  async function boot() {
    setupMarked();
    setupSearch();
    setupTheme();
    renderSidebar();
    try {
      state.config = await api.config.get();
    } catch (err) {
      toast('加载配置失败：' + err.message, 'error');
    }
    if (!location.hash) location.hash = '#/dashboard';
    await handleRoute();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
