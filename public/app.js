/* Second Brain Dashboard — v0.2
 *
 * Single-file SPA. No build, no framework.
 * Modules: state, api, helpers, toast, modal, markdown, router, render pages, cmdk, theme.
 */

(() => {
  'use strict';

  // state is loaded from public/lib/state.js (window.__state)
  const { state } = window.__state;
  // api is loaded from public/lib/api.js (window.__api.api)
  const { api } = window.__api;

  // ============================ API ===================================
  // bridge.js (loaded before app.js via <script src="/lib/bridge.js">) attaches
  // window.__bridge.{tauri, invokeOrFetch}. We destructure it here.
  const { tauri, invokeOrFetch } = window.__bridge;

  // Expose bridge state for cockpit + dev-tools introspection
  window.__secondBrainBridge = { tauri: !!tauri, kind: tauri ? tauri.kind : null };

  // ============================ Helpers ===============================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (s) => {
    if (!s) return '';
    try {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return s;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    return [...str][0].toUpperCase();
  };
  const debounce = (fn, ms) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  // Hash a string to a stable 32-bit int, then use it to pick a color from a list.
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }
  const AVATAR_GRADIENTS = [
    ['#fb923c', '#ea580c'], // orange
    ['#38bdf8', '#0284c7'], // sky
    ['#a78bfa', '#7c3aed'], // violet
    ['#34d399', '#059669'], // emerald
    ['#f472b6', '#db2777'], // pink
    ['#fbbf24', '#d97706'], // amber
    ['#f87171', '#dc2626'], // red
    ['#60a5fa', '#2563eb'], // blue
    ['#22d3ee', '#0891b2'], // cyan
    ['#c084fc', '#9333ea'], // purple
    ['#facc15', '#ca8a04'], // yellow
    ['#fb7185', '#e11d48'], // rose
  ];
  function avatarColors(seed) {
    const h = hashStr(seed || '');
    const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
    return {
      '--avatar-bg': a,
      '--avatar-bg2': b,
    };
  }

  // ============================ Toast =================================
  function toast(message, type = 'info') {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 200ms';
      setTimeout(() => el.remove(), 220);
    }, 4000);
  }

  // ============================ Modal =================================
  function openModal({ title, type, body, footer, large, prefixTitle }) {
    const root = $('#modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-close>
        <div class="modal ${large ? 'modal-large' : ''}" data-type="${type || ''}">
          <div class="modal-header">
            <div>
              ${prefixTitle ? `<div class="modal-title-prefix">${escapeHtml(prefixTitle)}</div>` : ''}
              <h3 class="modal-title">${escapeHtml(title)}</h3>
            </div>
            <button class="modal-close" data-close aria-label="关闭">
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
        if (e.target.closest('.modal') && !e.target.matches('[data-close]') && !e.target.closest('[data-close]')) return;
        closeModal();
      });
    });
    // Esc to close
    setTimeout(() => {
      const handler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handler); } };
      document.addEventListener('keydown', handler);
    }, 50);
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  // ============================ Markdown ==============================
  function setupMarked() {
    if (!window.marked) return;
    const renderer = new window.marked.Renderer();
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
    html = upgradeEmbeds(html, opts);
    // Smart mentions: auto-link known entity names that aren't already linked.
    html = applySmartMentions(html);
    return html;
  }

  // Scan rendered HTML and wrap known entity names in wikilink anchors.
  // Skips text inside <a>, <code>, <pre>, and existing wikilinks.
  function applySmartMentions(html) {
    if (!html || !state.allEntities || state.allEntities.length === 0) return html;
    // Sort by label length descending so longer names match first (e.g. "陈一-2" before "陈一")
    const entities = [...state.allEntities].sort((a, b) => b.label.length - a.label.length);
    // Use a DOM parser to walk the tree safely.
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const skipTags = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE']);
    const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let p = node.parentNode;
        while (p && p !== wrap) {
          if (p.nodeType === 1 && skipTags.has(p.tagName)) return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        // Skip wikilink children
        if (node.parentNode && node.parentNode.classList && (node.parentNode.classList.contains('wikilink') || node.parentNode.classList.contains('auto-mention'))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const texts = [];
    let n;
    while ((n = walker.nextNode())) texts.push(n);
    for (const text of texts) {
      const s = text.nodeValue;
      if (!s || s.length < 1) continue;
      // Build match list for this text node
      const matches = [];
      for (const e of entities) {
        // Find all occurrences of this entity's label
        const lbl = e.label;
        if (!lbl || lbl.length < 2) continue;
        let from = 0;
        while (true) {
          const idx = s.indexOf(lbl, from);
          if (idx < 0) break;
          // Check it's at a word boundary
          const before = idx > 0 ? s[idx - 1] : '';
          const after = idx + lbl.length < s.length ? s[idx + lbl.length] : '';
          const wordBefore = /[\w\u4e00-\u9fff]/.test(before);
          const wordAfter = /[\w\u4e00-\u9fff]/.test(after);
          if (!wordBefore && !wordAfter) {
            matches.push({ start: idx, end: idx + lbl.length, entity: e });
          }
          from = idx + 1;
        }
      }
      if (!matches.length) continue;
      // Sort by start position, dedup overlapping (longer wins)
      matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
      const nonOverlap = [];
      let lastEnd = -1;
      for (const m of matches) {
        if (m.start >= lastEnd) {
          nonOverlap.push(m);
          lastEnd = m.end;
        }
      }
      if (!nonOverlap.length) continue;
      // Build replacement DOM nodes
      const frag = document.createDocumentFragment();
      let cursor = 0;
      for (const m of nonOverlap) {
        if (m.start > cursor) frag.appendChild(document.createTextNode(s.slice(cursor, m.start)));
        const a = document.createElement('a');
        a.className = 'wikilink auto-mention';
        a.dataset.wikilink = `${state.config?.directories?.[m.entity.type] || m.entity.type}/${m.entity.slug}`;
        a.href = '#';
        a.textContent = s.slice(m.start, m.end);
        frag.appendChild(a);
        cursor = m.end;
      }
      if (cursor < s.length) frag.appendChild(document.createTextNode(s.slice(cursor)));
      // Replace text node with fragment
      text.parentNode.replaceChild(frag, text);
    }
    return wrap.innerHTML;
  }

  function upgradeEmbeds(html) {
    html = html.replace(/<a href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g, (m, href, text) => {
      if (text.trim() !== href.trim()) return m;
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

  // ============================ Routing ================================
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
      return { name: 'entity', params: { id: decodeURIComponent(h.slice('#/entity/'.length)) } };
    }
    return { name: h.replace(/^#\//, '') || 'dashboard', params: {} };
  }

  async function handleRoute() {
    const r = parseHash();
    const main = $('#main');
    main.innerHTML = `<div class="empty"><div class="spinner"></div></div>`;
    try {
      await refreshCounts();
      if (r.name === 'entity') await renderEntity(r.params.id);
      else {
        const fn = routes['#/' + r.name] || routes[''];
        await fn();
      }
      updateSidebarActive();
    } catch (err) {
      main.innerHTML = `<div class="empty"><h3>出错</h3><p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  window.addEventListener('hashchange', handleRoute);

  // ============================ Sidebar ===============================
  function renderSidebar() {
    const nav = $('#nav-list');
    const items = [
      { hash: '#/dashboard', label: '仪表盘', icon: 'home', count: null },
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
      el.addEventListener('click', () => { location.hash = el.dataset.hash; });
    });
    if (state.config?.vaultPath) {
      const v = state.config.vaultPath.split('/').filter(Boolean).pop() || state.config.vaultPath;
      $('#vault-name').textContent = v;
    }
  }

  function updateSidebarActive() {
    const hash = location.hash || '#/';
    $$('.nav-link').forEach((el) => {
      const isActive = el.dataset.hash === hash;
      el.classList.toggle('active', isActive);
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

  // ICONS dict is loaded from public/lib/icons.js (window.__ICONS)
  const ICONS = (window.__ICONS && window.__ICONS.ICONS) || {};
  function iconSvg(name, size = 16) {
    const path = ICONS[name] || '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  }

  function avatar(name, size) {
    const sizeCls = size === 'lg' ? 'avatar-lg' : '';
    const colors = avatarColors(name);
    const style = Object.entries(colors).map(([k, v]) => `${k}:${v}`).join(';');
    return `<div class="avatar ${sizeCls}" style="${style}">${escapeHtml(initials(name))}</div>`;
  }

  // ============================ Page: Dashboard ========================
  async function renderDashboard() {
    $('#page-title').textContent = '仪表盘';
    const main = $('#main');
    main.innerHTML = `
      <div class="dash-hero">
        <h2>你好 👋</h2>
        <div class="dash-subtitle">这是你的第二大脑，所有内容都同步到 Obsidian 仓库。</div>
        <div class="dash-hero-actions">
          <button class="btn btn-primary" data-action="quick-add">${iconSvg('plus')} 新建</button>
          <button class="btn" data-action="open-import">${iconSvg('link')} 导入链接</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card" data-type="person" data-hash="#/people">
          <div class="stat-label"><span class="stat-dot"></span>人物</div>
          <div class="stat-value">${state.counts.person || 0}</div>
        </div>
        <div class="stat-card" data-type="task" data-hash="#/tasks">
          <div class="stat-label"><span class="stat-dot"></span>任务</div>
          <div class="stat-value">${state.counts.task || 0}</div>
          <div class="stat-meta">待办 ${state.tasksByStatus?.todo || 0} · 进行 ${state.tasksByStatus?.in_progress || 0} · 完成 ${state.tasksByStatus?.done || 0}</div>
        </div>
        <div class="stat-card" data-type="project" data-hash="#/projects">
          <div class="stat-label"><span class="stat-dot"></span>项目</div>
          <div class="stat-value">${state.counts.project || 0}</div>
        </div>
        <div class="stat-card" data-type="link" data-hash="#/links">
          <div class="stat-label"><span class="stat-dot"></span>链接</div>
          <div class="stat-value">${state.counts.link || 0}</div>
        </div>
      </div>

      <div class="dash-grid">
        <div>
          <div class="dash-section">
            <div class="dash-section-header">
              <h3 class="dash-section-title">即将到期</h3>
              <a class="dash-section-link" href="#/tasks">查看全部 →</a>
            </div>
            ${state.dueTasks?.length ? renderTaskListRows(state.dueTasks.slice(0, 5)) : emptyStateHTML('inbox', '没有即将到期的任务')}
          </div>

          <div class="dash-section">
            <div class="dash-section-header">
              <h3 class="dash-section-title">最近编辑</h3>
            </div>
            ${state.recent?.length ? renderRecentGrid(state.recent.slice(0, 6)) : emptyStateHTML('folder', '还没有任何记录')}
          </div>
        </div>

        <div>
          <div class="widget">
            <h3 class="widget-title">${iconSvg('tag', 14)} 标签</h3>
            ${renderTagCloudGrouped(state.tags)}
          </div>
          <div class="widget">
            <h3 class="widget-title">${iconSvg('check', 14)} 任务进度</h3>
            ${renderTaskProgress()}
          </div>
        </div>
      </div>
    `;

    main.querySelector('[data-action="quick-add"]').addEventListener('click', openQuickAdd);
    main.querySelector('[data-action="open-import"]').addEventListener('click', openImportLinkModal);
    main.querySelectorAll('.stat-card').forEach((el) => {
      el.addEventListener('click', () => { location.hash = el.dataset.hash; });
    });
    attachRowHandlers(main);
  }

  function renderTaskListRows(tasks) {
    return `<div class="grid" style="grid-template-columns: 1fr 1fr;">${tasks.map((t) => `
      <div class="card" data-entity-id="${escapeHtml(t.id)}" data-type="task">
        <div class="card-title">${escapeHtml(t.data.title || t.slug)}</div>
        <div class="card-meta">
          <span class="status status-${escapeHtml(t.data.status || 'todo')}">${statusLabel(t.data.status)}</span>
          <span class="priority-${escapeHtml(t.data.priority || 'medium')}">${priorityLabel(t.data.priority)}</span>
          ${t.data.due ? `<span>${iconSvg('calendar', 11)} ${escapeHtml(t.data.due)}</span>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  function renderRecentGrid(items) {
    return `<div class="grid">${items.map((e) => recentCardHtml(e)).join('')}</div>`;
  }

  function recentCardHtml(e) {
    const title = e.data.title || e.data.name || e.slug;
    if (e.type === 'person') {
      return `<div class="card" data-entity-id="${escapeHtml(e.id)}" data-type="person">
        <div class="person-card-row">
          ${avatar(title)}
          <div class="card-title-stack">
            <div class="card-title">${escapeHtml(title)}</div>
            <div class="card-meta">
              ${e.data.status ? `<span class="status status-${escapeHtml(e.data.status)}">${statusLabel(e.data.status)}</span>` : ''}
              ${e.data.company ? `<span>${escapeHtml(e.data.company)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }
    if (e.type === 'link' && e.data.cover) {
      return `<div class="card" data-entity-id="${escapeHtml(e.id)}" data-type="link">
        <img class="card-cover" src="${escapeHtml(e.data.cover)}" alt="" loading="lazy" onerror="this.style.display='none'" />
        <div class="card-meta"><span>${escapeHtml(e.data.site || '')}</span></div>
        <div class="card-title">${escapeHtml(title)}</div>
      </div>`;
    }
    return `<div class="card" data-entity-id="${escapeHtml(e.id)}" data-type="${e.type}">
      <div class="card-meta"><span>${typeLabel(e.type)}</span><span>${fmtDate(e.data.updated)}</span></div>
      <div class="card-title">${escapeHtml(title)}</div>
      ${e.data.description ? `<div class="card-body">${escapeHtml(e.data.description)}</div>` : ''}
    </div>`;
  }

  function renderTagCloudGrouped(tags) {
    const entries = Object.entries(tags || {});
    if (!entries.length) return '<div class="muted">还没有标签</div>';
    // Group by type via inspecting recent items... too expensive; just show flat for now
    const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 24);
    return `<div class="tag-cloud">${sorted.map(([t, n]) => `<span class="tag">#${escapeHtml(t)} <span class="text-faint">${n}</span></span>`).join('')}</div>`;
  }

  function renderTaskProgress() {
    const s = state.tasksByStatus || { todo: 0, in_progress: 0, done: 0, cancelled: 0 };
    const total = (s.todo || 0) + (s.in_progress || 0) + (s.done || 0) + (s.cancelled || 0);
    if (!total) return '<div class="muted">还没有任务</div>';
    const segments = [
      { key: 'done', label: '已完成', count: s.done || 0, color: 'var(--success)' },
      { key: 'in_progress', label: '进行中', count: s.in_progress || 0, color: 'var(--type-task)' },
      { key: 'todo', label: '待办', count: s.todo || 0, color: 'var(--text-faint)' },
      { key: 'cancelled', label: '已取消', count: s.cancelled || 0, color: 'var(--surface-3)' },
    ];
    const pct = (n) => total ? (n / total) * 100 : 0;
    return `
      <div style="display:flex; height:8px; border-radius:999px; overflow:hidden; background:var(--surface-3); margin-bottom: 10px;">
        ${segments.filter(s => s.count).map((s) => `<div style="width:${pct(s.count)}%; background:${s.color};" title="${s.label} ${s.count}"></div>`).join('')}
      </div>
      ${segments.map((s) => `
        <div class="widget-row">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${s.color};"></span>
          <span>${s.label}</span>
          <span class="meta">${s.count}</span>
        </div>`).join('')}
    `;
  }

  // ============================ Empty states ==========================
  function emptyStateSVG(kind) {
    const map = {
      user: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" class="empty-illustration">
        <circle cx="48" cy="36" r="16" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" opacity="0.4"/>
        <path d="M20 80c0-15 12-25 28-25s28 10 28 25" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" opacity="0.4"/>
      </svg>`,
      check: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" class="empty-illustration">
        <rect x="20" y="20" width="56" height="56" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" opacity="0.4"/>
        <path d="M32 48l12 12 20-24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      folder: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" class="empty-illustration">
        <path d="M16 32l8-12h16l8 12h32v36H16z" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" opacity="0.4"/>
        <circle cx="48" cy="56" r="6" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
      </svg>`,
      link: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" class="empty-illustration">
        <path d="M30 50c0-10 8-18 18-18s18 8 18 18" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
        <path d="M66 50c0 10-8 18-18 18s-18-8-18-18" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
        <circle cx="48" cy="50" r="6" fill="currentColor" opacity="0.4"/>
      </svg>`,
      inbox: `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" class="empty-illustration">
        <path d="M20 30h56l8 24v22H12V54z" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3" opacity="0.4"/>
        <line x1="20" y1="54" x2="76" y2="54" stroke="currentColor" stroke-width="2" opacity="0.4"/>
      </svg>`,
    };
    return map[kind] || '';
  }

  function emptyStateHTML(kind, title, body) {
    return `<div class="empty">
      ${emptyStateSVG(kind)}
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      ${body ? `<p>${escapeHtml(body)}</p>` : ''}
    </div>`;
  }

  // ============================ Page: People ==========================
  // Get all unique tags from a list of entities (counts each tag)
  function collectTags(items) {
    const out = {};
    for (const e of items) for (const t of e.data?.tags || []) out[t] = (out[t] || 0) + 1;
    return out;
  }

  // Wire up tag filter chip clicks after a list page has rendered.
  function wireTagFilters(typeKey) {
    document.querySelectorAll(`.tag-filter-chip[data-type="${typeKey}"]`).forEach((chip) => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        if (state.activeTagFilters.has(tag)) state.activeTagFilters.delete(tag);
        else state.activeTagFilters.add(tag);
        // Re-render the current page
        const hash = location.hash || '#/dashboard';
        if (hash.startsWith('#/people')) renderPeople();
        else if (hash.startsWith('#/projects')) renderProjects();
        else if (hash.startsWith('#/links')) renderLinks();
      });
    });
    const clear = document.querySelector('[data-action="clear-filters"]');
    if (clear) clear.addEventListener('click', () => {
      state.activeTagFilters.clear();
      const hash = location.hash || '#/dashboard';
      if (hash.startsWith('#/people')) renderPeople();
      else if (hash.startsWith('#/projects')) renderProjects();
      else if (hash.startsWith('#/links')) renderLinks();
    });
  }

  // Render the tag filter bar. Returns HTML string (or empty string if no tags / no filters).
  function renderTagFilterBar(items, typeKey) {
    const tags = collectTags(items);
    const entries = Object.entries(tags).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '';
    const active = state.activeTagFilters;
    const chips = entries.map(([t, n]) => {
      const isActive = active.has(t);
      return `<span class="tag-filter-chip ${isActive ? 'is-active' : ''}" data-tag="${escapeHtml(t)}" data-type="${typeKey}">
        #${escapeHtml(t)} <span style="opacity:0.6">${n}</span>${isActive ? '<span class="chip-x">×</span>' : ''}
      </span>`;
    }).join('');
    return `<div class="tag-filter">
      <span class="tag-filter-label">筛选</span>
      ${chips}
      ${active.size ? `<span class="tag-filter-clear" data-action="clear-filters">清除</span>` : ''}
    </div>`;
  }

  // Apply tag filter to a list. AND logic: entity must have ALL active tags.
  function applyTagFilter(items) {
    if (!state.activeTagFilters.size) return items;
    return items.filter((e) => {
      const tags = e.data?.tags || [];
      for (const t of state.activeTagFilters) if (!tags.includes(t)) return false;
      return true;
    });
  }

  async function renderPeople() {
    $('#page-title').textContent = '人物';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>人物</h2>
          <div class="subtitle">记录我认识的人，以及他们与项目 / 任务的联系。</div>
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
    // Tag filter bar
    const filterBar = renderTagFilterBar(items, 'person');
    if (filterBar) {
      const bar = document.createElement('div');
      bar.innerHTML = filterBar;
      list.parentNode.insertBefore(bar.firstChild, list);
    }
    const filtered = applyTagFilter(items);
    if (!items.length) {
      list.innerHTML = emptyStateHTML('user', '还没有人物', '点击右上角新增你的第一个人物卡片。');
    } else if (!filtered.length) {
      list.innerHTML = '<div class="empty"><h3>没有匹配</h3><p>当前筛选下没有人物。试试清除筛选？</p></div>';
    } else {
      list.innerHTML = `<div class="grid">${filtered.map(personCardHtml).join('')}</div>`;
    }
    main.querySelector('[data-action="new-person"]').addEventListener('click', () => openEntityModal('person'));
    attachRowHandlers(list);
    wireTagFilters('person');
  }

  function personCardHtml(p) {
    const name = p.data.name || p.slug;
    return `<div class="card" data-entity-id="${escapeHtml(p.id)}" data-type="person">
      <div class="person-card-row">
        ${avatar(name)}
        <div class="card-title-stack">
          <div class="card-title">${escapeHtml(name)}</div>
          <div class="card-meta">
            ${p.data.status ? `<span class="status status-${escapeHtml(p.data.status)}">${statusLabel(p.data.status)}</span>` : ''}
            ${p.data.company ? `<span>${escapeHtml(p.data.company)}</span>` : ''}
            ${p.data.met ? `<span>${iconSvg('calendar', 11)} ${escapeHtml(p.data.met)}</span>` : ''}
          </div>
        </div>
      </div>
      ${renderTagRow(p.data.tags)}
    </div>`;
  }

  // ============================ Page: Tasks ===========================
  async function renderTasks() {
    $('#page-title').textContent = '任务';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>任务</h2>
          <div class="subtitle">看板视图 — 拖拽切换状态，点击「+」直接在列里添加。</div>
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
      { id: 'todo', title: '待办' },
      { id: 'in_progress', title: '进行中' },
      { id: 'done', title: '已完成' },
      { id: 'cancelled', title: '已取消' },
    ];
    for (const t of items) {
      const col = columns.find((c) => c.id === (t.data.status || 'todo')) || columns[0];
      col.items = col.items || [];
      col.items.push(t);
    }
    for (const col of columns) {
      col.items = (col.items || []).sort((a, b) => (a.data.due || 'z').localeCompare(b.data.due || 'z'));
    }

    const kanban = $('#kanban');
    kanban.innerHTML = columns.map((col) => `
      <div class="kanban-col" data-status="${col.id}" data-drop-active="false">
        <div class="kanban-col-header">
          <div class="kanban-col-title">${col.title}</div>
          <div class="kanban-col-count">${(col.items || []).length}</div>
        </div>
        ${(col.items || []).length === 0
          ? `<div class="kanban-empty">— 空白 —</div>`
          : (col.items || []).map(taskCardHtml).join('')}
        <button class="kanban-add" data-action="add-to-col" data-status="${col.id}">+ 添加任务</button>
      </div>
    `).join('');

    main.querySelector('[data-action="new-task"]').addEventListener('click', () => openEntityModal('task'));
    main.querySelectorAll('[data-action="add-to-col"]').forEach((btn) => {
      btn.addEventListener('click', () => openEntityModal('task', null, btn.dataset.status));
    });
    // Inline status popover
    main.querySelectorAll('[data-action="status-pop"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const card = el.closest('.kanban-card');
        if (!card) return;
        const id = card.dataset.entityId;
        const currentStatus = el.dataset.status;
        openStatusPopover(el, currentStatus, async (newStatus) => {
          if (newStatus === currentStatus) return;
          // Optimistic: move DOM
          const col = card.parentElement;
          col.removeChild(card);
          const targetCol = document.querySelector(`.kanban-col[data-status="${newStatus}"]`);
          const addBtn = targetCol.querySelector('.kanban-add');
          targetCol.insertBefore(card, addBtn);
          updateColCount(col);
          updateColCount(targetCol);
          el.dataset.status = newStatus;
          el.className = `kanban-card-status status status-${newStatus}`;
          el.textContent = ({ todo: '待办', in_progress: '进行中', done: '已完成', cancelled: '已取消' })[newStatus];
          try {
            await api.update(id, { data: { status: newStatus } });
            const t = state.entities.task.find((x) => x.id === id);
            if (t) { t.data.status = newStatus; t.data.updated = new Date().toISOString(); }
            await refreshCounts();
          } catch (err) {
            toast('更新失败：' + err.message, 'error');
            handleRoute();
          }
        });
      });
    });
    attachRowHandlers(kanban);
    initKanbanDnD(kanban);
  }

  function taskCardHtml(t) {
    const overdue = t.data.due && new Date(t.data.due) < new Date() && t.data.status !== 'done' && t.data.status !== 'cancelled';
    return `<div class="kanban-card" data-entity-id="${escapeHtml(t.id)}" data-type="task" draggable="true">
      <div class="kanban-card-title">${escapeHtml(t.data.title || t.slug)}</div>
      <div class="kanban-card-meta">
        <span class="kanban-card-status status status-${escapeHtml(t.data.status || 'todo')}" data-status="${escapeHtml(t.data.status || 'todo')}" data-action="status-pop">${statusLabel(t.data.status)}</span>
        <span class="priority-${escapeHtml(t.data.priority || 'medium')}">${priorityLabel(t.data.priority)}</span>
        ${t.data.due ? `<span style="color:${overdue ? 'var(--danger)' : 'inherit'}">${iconSvg('calendar', 11)} ${escapeHtml(t.data.due)}</span>` : ''}
        ${(t.data.tags || []).slice(0, 2).map((tg) => `<span class="tag">#${escapeHtml(tg)}</span>`).join('')}
      </div>
    </div>`;
  }

  // Click status pill to change status via popover.
  function openStatusPopover(anchor, currentStatus, onPick) {
    closeStatusPopover();
    const pop = document.createElement('div');
    pop.className = 'status-popover';
    pop.dataset.role = 'status-popover';
    const options = [
      { v: 'todo', label: '待办' },
      { v: 'in_progress', label: '进行中' },
      { v: 'done', label: '已完成' },
      { v: 'cancelled', label: '已取消' },
    ];
    pop.innerHTML = options.map((o) => `
      <div class="status-popover-item ${o.v === currentStatus ? 'is-current' : ''}" data-status="${o.v}">
        <span class="status status-${o.v}" style="pointer-events:none;">
          <span></span><span>${o.label}</span>
        </span>
      </div>
    `).join('');
    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    pop.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    pop.style.left = (rect.left + window.scrollX) + 'px';
    pop.addEventListener('click', (e) => {
      const item = e.target.closest('.status-popover-item');
      if (!item) return;
      e.stopPropagation();
      onPick(item.dataset.status);
      closeStatusPopover();
    });
    // Close on outside click
    setTimeout(() => {
      const handler = (ev) => {
        if (!pop.contains(ev.target) && ev.target !== anchor) {
          closeStatusPopover();
          document.removeEventListener('mousedown', handler);
        }
      };
      document.addEventListener('mousedown', handler);
    }, 0);
  }
  function closeStatusPopover() {
    document.querySelectorAll('.status-popover').forEach((el) => el.remove());
  }

  // ============================ Kanban drag-and-drop ===================
  function initKanbanDnD(root) {
    let draggedId = null;
    root.querySelectorAll('.kanban-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        draggedId = card.dataset.entityId;
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', draggedId); } catch {}
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        draggedId = null;
        root.querySelectorAll('.kanban-col').forEach((c) => c.dataset.dropActive = 'false');
      });
    });
    root.querySelectorAll('.kanban-col').forEach((col) => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.dataset.dropActive = 'true';
      });
      col.addEventListener('dragleave', (e) => {
        // Only clear if leaving the column itself, not children
        if (e.target === col || !col.contains(e.relatedTarget)) {
          col.dataset.dropActive = 'false';
        }
      });
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.dataset.dropActive = 'false';
        const id = (e.dataTransfer.getData('text/plain')) || draggedId;
        if (!id) return;
        const newStatus = col.dataset.status;
        // Optimistic update
        const card = root.querySelector(`.kanban-card[data-entity-id="${id}"]`);
        if (card) {
          const src = card.parentElement;
          src.removeChild(card);
          // Insert above the add button
          const addBtn = col.querySelector('.kanban-add');
          col.insertBefore(card, addBtn);
          // Update counts
          updateColCount(src);
          updateColCount(col);
        }
        try {
          await api.update(id, { data: { status: newStatus } });
          // Refresh state
          const t = state.entities.task.find((x) => x.id === id);
          if (t) {
            t.data.status = newStatus;
            t.data.updated = new Date().toISOString();
          }
          await refreshCounts();
        } catch (err) {
          toast('更新失败：' + err.message, 'error');
          handleRoute(); // Re-render to recover state
        }
      });
    });
  }

  function updateColCount(col) {
    const countEl = col.querySelector('.kanban-col-count');
    const cards = col.querySelectorAll('.kanban-card');
    if (countEl) countEl.textContent = String(cards.length);
    // Toggle empty state
    const existingEmpty = col.querySelector('.kanban-empty');
    if (cards.length === 0 && !existingEmpty) {
      const empty = document.createElement('div');
      empty.className = 'kanban-empty';
      empty.textContent = '— 空白 —';
      col.insertBefore(empty, col.querySelector('.kanban-add'));
    } else if (cards.length > 0 && existingEmpty) {
      existingEmpty.remove();
    }
  }

  // ============================ Page: Projects ========================
  async function renderProjects() {
    $('#page-title').textContent = '项目';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>项目</h2>
          <div class="subtitle">主题、目标、相关人物 / 任务 / 链接都集中在这里。</div>
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
    const filterBar = renderTagFilterBar(items, 'project');
    if (filterBar) {
      const bar = document.createElement('div');
      bar.innerHTML = filterBar;
      list.parentNode.insertBefore(bar.firstChild, list);
    }
    const filtered = applyTagFilter(items);
    if (!items.length) {
      list.innerHTML = emptyStateHTML('folder', '还没有项目', '创建一个项目，把相关的任务、链接、人串起来。');
    } else if (!filtered.length) {
      list.innerHTML = '<div class="empty"><h3>没有匹配</h3><p>当前筛选下没有项目。</p></div>';
    } else {
      list.innerHTML = `<div class="grid">${filtered.map(projectCardHtml).join('')}</div>`;
    }
    main.querySelector('[data-action="new-project"]').addEventListener('click', () => openEntityModal('project'));
    attachRowHandlers(list);
    wireTagFilters('project');
  }

  function projectCardHtml(p) {
    return `<div class="card" data-entity-id="${escapeHtml(p.id)}" data-type="project">
      <div class="card-meta"><span>${typeLabel('project')}</span><span>${fmtDate(p.data.updated)}</span></div>
      <div class="card-title">${escapeHtml(p.data.title || p.slug)}</div>
      ${p.data.description ? `<div class="card-body">${escapeHtml(p.data.description)}</div>` : ''}
      ${renderTagRow(p.data.tags)}
    </div>`;
  }

  // ============================ Page: Links ===========================
  async function renderLinks() {
    $('#page-title').textContent = '链接';
    const main = $('#main');
    main.innerHTML = `
      <div class="page-header">
        <div>
          <h2>链接</h2>
          <div class="subtitle">从外部导入的文章 / 视频 / 资料，可以离线阅读。</div>
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
    const filterBar = renderTagFilterBar(items, 'link');
    if (filterBar) {
      const bar = document.createElement('div');
      bar.innerHTML = filterBar;
      list.parentNode.insertBefore(bar.firstChild, list);
    }
    const filtered = applyTagFilter(items);
    if (!items.length) {
      list.innerHTML = emptyStateHTML('link', '还没有链接', '粘贴一个 URL，抓取后会作为卡片保存。');
    } else if (!filtered.length) {
      list.innerHTML = '<div class="empty"><h3>没有匹配</h3><p>当前筛选下没有链接。</p></div>';
    } else {
      list.innerHTML = `<div class="grid">${filtered.map(linkCardItemHtml).join('')}</div>`;
    }
    main.querySelector('[data-action="import-link"]').addEventListener('click', openImportLinkModal);
    attachRowHandlers(list);
    wireTagFilters('link');
  }

  function linkCardItemHtml(l) {
    const cover = l.data.cover ? `<img class="card-cover" src="${escapeHtml(l.data.cover)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : '';
    return `<div class="card" data-entity-id="${escapeHtml(l.id)}" data-type="link">
      ${cover}
      <div class="card-meta">
        ${l.data.site ? `<span>${escapeHtml(l.data.site)}</span>` : ''}
        <span>${l.data.fetchMode === 'deep' ? '深度抓取' : '轻量'}</span>
        ${l.data.fetchStatus === 'failed' ? '<span style="color:var(--warning)">⚠ 抓取失败</span>' : ''}
      </div>
      <div class="card-title">${escapeHtml(l.data.title || l.slug)}</div>
      ${l.data.description ? `<div class="card-body">${escapeHtml(l.data.description)}</div>` : ''}
      ${renderTagRow(l.data.tags)}
    </div>`;
  }

  // ============================ Page: Settings ========================
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
        <h3 style="margin: 0 0 8px; font-size: 14px;">主题</h3>
        <div class="editor-row">
          <label>外观</label>
          <div style="display:flex; gap: 6px; flex-wrap: wrap;">
            ${['light', 'dark', 'sepia'].map(t => `
              <button class="btn btn-sm ${state.theme === t ? 'btn-primary' : ''}" data-action="set-theme" data-theme="${t}">${t === 'light' ? '浅色' : t === 'dark' ? '深色' : '复古'}</button>
            `).join('')}
          </div>
        </div>
        <div class="hr"></div>
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
        toast('已保存。重启服务器后端口 / 地址生效。', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });
    main.querySelectorAll('[data-action="set-theme"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        applyTheme();
        renderSettings();
      });
    });
  }

  // ============================ Quick add =============================
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
    openModal({ title: '快速新建', type: 'task', body: html, footer: `<button class="btn" data-close>取消</button><button class="btn btn-primary" id="qa-submit">创建</button>` });
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

  // ============================ Entity modal =========================
  async function preloadAllEntities() {
    if (state.allEntities.length > 0) return;
    try {
      const [p, t, pr, l] = await Promise.all([
        api.list('person'), api.list('task'), api.list('project'), api.list('link'),
      ]);
      const all = [];
      for (const e of p) all.push({ type: 'person', slug: e.slug, label: e.data.name || e.slug });
      for (const e of t) all.push({ type: 'task', slug: e.slug, label: e.data.title || e.slug });
      for (const e of pr) all.push({ type: 'project', slug: e.slug, label: e.data.title || e.slug });
      for (const e of l) all.push({ type: 'link', slug: e.slug, label: e.data.title || e.slug });
      // Dedup
      const seen = new Set();
      state.allEntities = all.filter((m) => {
        const k = `${m.type}/${m.slug}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } catch (e) { console.warn('preloadAllEntities failed', e); }
  }

  async function openEntityModal(type, existing, initialStatus) {
    await preloadAllEntities();
    const isEdit = !!existing;
    const d = existing?.data || {};
    if (initialStatus) d.status = initialStatus;
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
    const typeLabelMap = { person: '人物', task: '任务', project: '项目', link: '链接' };
    openModal({
      title: `${isEdit ? '编辑' : '新建'} ${typeLabelMap[type]}`,
      type,
      prefixTitle: typeLabelMap[type].toUpperCase(),
      body: formHtml,
      footer: isEdit
        ? `<button class="btn btn-danger" id="f-delete">${iconSvg('trash')} 删除</button>
           <button class="btn" data-close>取消</button>
           <button class="btn btn-primary" id="f-save">${iconSvg('check')} 保存</button>`
        : `<button class="btn" data-close>取消</button>
           <button class="btn btn-primary" id="f-save">${iconSvg('check')} ${isEdit ? '保存' : '创建'}</button>`,
    });

    $('#f-save').addEventListener('click', async () => {
      const title = $('#f-title').value.trim();
      if (!title) { toast('请填写标题 / 姓名', 'error'); return; }
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
        if (isEdit) await api.update(existing.id, { data, body });
        else await api.create({ type, title, data, body });
        // Refresh wikilink autocomplete cache so the new entity is available.
        state.allEntities = [];
        toast(isEdit ? '已保存' : '已创建', 'success');
        closeModal();
        if (isEdit) location.hash = `#/entity/${encodeURIComponent(existing.id)}`;
        else handleRoute();
      } catch (err) { toast(err.message, 'error'); }
    });
    if (isEdit) {
      $('#f-delete').addEventListener('click', async () => {
        if (!confirm('确定删除？此操作会从 Obsidian Vault 移除对应 .md 文件。')) return;
        try {
          await api.delete(existing.id);
          state.allEntities = [];
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
        { value: 'active', label: '活跃' }, { value: 'dormant', label: '久未联系' }, { value: 'archived', label: '已归档' },
      ] },
      { key: 'met', label: '认识于', kind: 'date' },
      { key: 'company', label: '公司 / 团队', kind: 'text' },
      { key: 'role', label: '角色 / 头衔', kind: 'text' },
      { key: 'contact', label: '联系方式', kind: 'object', fields: [
        { key: 'email', label: '邮箱' }, { key: 'phone', label: '电话' }, { key: 'wechat', label: '微信' },
      ] },
      { key: 'social', label: '社交账号', kind: 'object', fields: [
        { key: 'github', label: 'GitHub' }, { key: 'twitter', label: 'Twitter / X' },
        { key: 'linkedin', label: 'LinkedIn' }, { key: 'website', label: '个人站' },
      ] },
      { key: 'tags', label: '标签', kind: 'tags' },
    ];
    if (type === 'task') return [
      { key: 'status', label: '状态', kind: 'select', options: [
        { value: 'todo', label: '待办' }, { value: 'in_progress', label: '进行中' },
        { value: 'done', label: '已完成' }, { value: 'cancelled', label: '已取消' },
      ] },
      { key: 'priority', label: '优先级', kind: 'select', options: [
        { value: 'low', label: '低' }, { value: 'medium', label: '中' }, { value: 'high', label: '高' },
      ] },
      { key: 'due', label: '截止日期', kind: 'date' },
      { key: 'project', label: '所属项目', kind: 'entity-ref', refType: 'project' },
      { key: 'tags', label: '标签', kind: 'tags' },
    ];
    if (type === 'project') return [
      { key: 'status', label: '状态', kind: 'select', options: [
        { value: 'active', label: '进行中' }, { value: 'paused', label: '暂停' },
        { value: 'done', label: '已完成' }, { value: 'archived', label: '归档' },
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
    const id = 'f-' + f.key;
    const v = value == null ? '' : value;
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
    if (f.kind === 'tags') return el.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
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

  // ============================ Import link modal =====================
  function openImportLinkModal() {
    const html = `
      <div class="editor">
        <div class="editor-row"><label>URL</label><input id="imp-url" placeholder="https://..." autofocus /></div>
        <div class="editor-row"><label>标题（可选）</label><input id="imp-title" placeholder="留空则自动获取页面标题" /></div>
        <div class="editor-row"><label>标签</label><input id="imp-tags" placeholder="逗号分隔" /></div>
        <div class="editor-row" style="align-items:flex-start;">
          <label>抓取方式</label>
          <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
            <label style="display:flex; gap:6px; align-items:center; padding:8px 10px; border:1px solid var(--border); border-radius: var(--r-sm); cursor:pointer;">
              <input type="radio" name="imp-mode" value="light" checked />
              <span><strong>轻量</strong> · 仅元信息（标题 / 封面 / 描述）</span>
            </label>
            <label style="display:flex; gap:6px; align-items:center; padding:8px 10px; border:1px solid var(--border); border-radius: var(--r-sm); cursor:pointer;">
              <input type="radio" name="imp-mode" value="deep" />
              <span><strong>深度</strong> · 抓取全文 → Markdown，离线可读</span>
            </label>
          </div>
        </div>
      </div>`;
    openModal({
      title: '导入链接',
      type: 'link',
      prefixTitle: '链接',
      body: html,
      footer: `<button class="btn" data-close>取消</button>
               <button class="btn btn-primary" id="imp-go">${iconSvg('check')} 抓取并保存</button>`,
    });
    $('#imp-go').addEventListener('click', async () => {
      const url = $('#imp-url').value.trim();
      const title = $('#imp-title').value.trim();
      const tags = $('#imp-tags').value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      const deep = document.querySelector('input[name="imp-mode"]:checked').value === 'deep';
      if (!url) { toast('请填写 URL', 'error'); return; }
      const btn = $('#imp-go');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> 抓取中…`;
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
      btn.innerHTML = `${iconSvg('check')} 抓取并保存`;
    });
  }

  // ============================ Entity detail page ====================
  async function renderEntity(id) {
    await preloadAllEntities();
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
        <div class="detail-hero" data-type="${entity.type}">
          ${entity.type === 'person' ? avatar(entity.data.name || entity.slug, 'lg') : ''}
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
    return `<div class="embed">${linkCardHtml({ title: d.title, url: d.url, description: d.description, cover: d.cover, site: d.site })}</div>`;
  }

  function renderEntityRelations(entity) {
    if (!entity.body) return '';
    const refs = [...entity.body.matchAll(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g)].map((m) => m[1]);
    if (!refs.length) return '';
    return `<div class="dash-section" style="margin-top: var(--sp-7);">
      <div class="dash-section-header"><h3 class="dash-section-title">交叉引用</h3></div>
      <div class="muted">${refs.length} 处引用，渲染时已尝试解析。点击 wikilink 跳转。</div>
    </div>`;
  }

  // ============================ Wikilinks ============================
  function bindWikilinks(root) {
    root.querySelectorAll('[data-wikilink]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.dataset.wikilink;
        if (target.includes('/')) {
          location.hash = `#/entity/${encodeURIComponent(target)}`;
        } else {
          location.hash = `#/entity/${encodeURIComponent(state.config.directories.person + '/' + target)}`;
        }
      });
    });
  }

  // ============================ Shared render helpers =================
  function renderTagRow(tags) {
    if (!tags || !tags.length) return '';
    return `<div class="tag-row" style="margin-top:8px;">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>`;
  }
  function statusLabel(s) {
    return ({ todo: '待办', in_progress: '进行中', done: '已完成', cancelled: '已取消',
              active: '活跃', dormant: '久未联系', archived: '已归档', paused: '暂停' })[s] || s || '';
  }
  function priorityLabel(p) { return ({ low: '低', medium: '中', high: '高' })[p] || p || ''; }
  function typeLabel(t) { return ({ person: '人物', task: '任务', project: '项目', link: '链接' })[t] || t; }
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
      el.addEventListener('click', () => { location.hash = `#/entity/${encodeURIComponent(el.dataset.entityId)}`; });
    });
  }

  // ============================ Search ================================
  function setupSearch() {
    const input = $('#search-input');
    const results = $('#search-results');
    const close = () => results.classList.add('hidden');
    const run = debounce(async () => {
      const q = input.value.trim();
      if (!q) { close(); return; }
      try {
        const { items } = await api.search(q);
        state.searchResults = items.slice(0, 12);
        state.searchActiveIndex = -1;
        if (!items.length) {
          results.innerHTML = `<div class="search-result"><div class="search-result-meta">无结果</div></div>`;
        } else {
          results.innerHTML = items.slice(0, 12).map((it, i) => {
            const t = it.type;
            return `<div class="search-result ${i === state.searchActiveIndex ? 'is-active' : ''}" data-id="${escapeHtml(it.id)}" data-index="${i}">
              <span class="search-result-type ${t}">${typeLabel(t).slice(0, 1)}</span>
              <span class="search-result-title">${escapeHtml(it.data.title || it.data.name || it.slug)}</span>
              <span class="search-result-meta">${fmtDateTime(it.data.updated)}</span>
            </div>`;
          }).join('');
        }
        results.classList.remove('hidden');
        results.querySelectorAll('.search-result[data-id]').forEach((r) => {
          r.addEventListener('click', () => {
            location.hash = `#/entity/${encodeURIComponent(r.dataset.id)}`;
            input.value = '';
            close();
          });
        });
      } catch (err) { /* ignore */ }
    }, 200);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (input.value) run(); });
    input.addEventListener('keydown', (e) => {
      if (!results.classList.contains('hidden') && state.searchResults.length) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          state.searchActiveIndex = Math.min(state.searchResults.length - 1, state.searchActiveIndex + 1);
          updateActiveSearchResult();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          state.searchActiveIndex = Math.max(0, state.searchActiveIndex - 1);
          updateActiveSearchResult();
        } else if (e.key === 'Enter' && state.searchActiveIndex >= 0) {
          e.preventDefault();
          const sel = state.searchResults[state.searchActiveIndex];
          location.hash = `#/entity/${encodeURIComponent(sel.id)}`;
          input.value = '';
          close();
        } else if (e.key === 'Escape') {
          close();
        }
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search')) close();
    });
  }
  function updateActiveSearchResult() {
    $$('.search-result').forEach((el, i) => {
      el.classList.toggle('is-active', i === state.searchActiveIndex);
    });
  }

  // ============================ Command Palette (Cmd+K) ================
  function openCmdK() {
    const root = $('#cmdk-root');
    root.innerHTML = `
      <div class="cmdk-backdrop">
        <div class="cmdk">
          <div class="cmdk-input-row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input class="cmdk-input" id="cmdk-input" placeholder="搜索人物、任务、项目、链接或输入命令…" autofocus />
          </div>
          <div class="cmdk-results" id="cmdk-results"></div>
        </div>
      </div>`;
    const input = $('#cmdk-input');
    const results = $('#cmdk-results');
    let activeIndex = 0;
    let items = [];

    function getCommands() {
      return [
        { type: 'command', id: 'cmd-new-person', label: '新建人物', icon: 'plus' },
        { type: 'command', id: 'cmd-new-task', label: '新建任务', icon: 'plus' },
        { type: 'command', id: 'cmd-new-project', label: '新建项目', icon: 'plus' },
        { type: 'command', id: 'cmd-import-link', label: '导入链接', icon: 'link' },
        { type: 'command', id: 'cmd-theme-light', label: '主题：浅色', icon: 'sun' },
        { type: 'command', id: 'cmd-theme-dark', label: '主题：深色', icon: 'moon' },
        { type: 'command', id: 'cmd-theme-sepia', label: '主题：复古', icon: 'palette' },
        { type: 'command', id: 'cmd-settings', label: '打开设置', icon: 'settings' },
      ];
    }

    function render() {
      const q = input.value.trim().toLowerCase();
      const all = [
        ...getCommands(),
        ...state.entities.person.map((e) => ({ type: e.type, id: e.id, label: e.data.name || e.slug })),
        ...state.entities.task.map((e) => ({ type: e.type, id: e.id, label: e.data.title || e.slug })),
        ...state.entities.project.map((e) => ({ type: e.type, id: e.id, label: e.data.title || e.slug })),
        ...state.entities.link.map((e) => ({ type: e.type, id: e.id, label: e.data.title || e.slug })),
      ];
      items = q ? all.filter((it) => it.label.toLowerCase().includes(q) || (it.type !== 'command' && it.id.toLowerCase().includes(q))) : all.slice(0, 12);
      if (activeIndex >= items.length) activeIndex = Math.max(0, items.length - 1);

      if (!items.length) {
        results.innerHTML = `<div class="cmdk-empty">没有匹配项</div>`;
        return;
      }

      const commands = items.filter((it) => it.type === 'command');
      const entities = items.filter((it) => it.type !== 'command');
      const grouped = [];
      if (commands.length) {
        grouped.push(`<div class="cmdk-section">命令</div>`);
        grouped.push(commands.map((it, i) => renderItem(it, items.indexOf(it))).join(''));
      }
      if (entities.length) {
        if (commands.length) grouped.push(`<div style="height: 6px;"></div>`);
        grouped.push(`<div class="cmdk-section">实体</div>`);
        grouped.push(entities.map((it) => renderItem(it, items.indexOf(it))).join(''));
      }
      results.innerHTML = grouped.join('');
      $$('.cmdk-item').forEach((el) => {
        el.addEventListener('click', () => execute(el.dataset.index));
      });
    }
    function renderItem(it, index) {
      const isCmd = it.type === 'command';
      const badge = isCmd ? `<span class="item-type-badge command">⌘</span>` : `<span class="item-type-badge ${it.type}">${typeLabel(it.type).slice(0, 1)}</span>`;
      return `<div class="cmdk-item ${index === activeIndex ? 'is-active' : ''}" data-index="${index}">${badge}<span>${escapeHtml(it.label)}</span></div>`;
    }
    function execute(idx) {
      const it = items[idx];
      if (!it) return;
      if (it.type === 'command') {
        const cmds = {
          'cmd-new-person': () => openEntityModal('person'),
          'cmd-new-task': () => openEntityModal('task'),
          'cmd-new-project': () => openEntityModal('project'),
          'cmd-import-link': () => openImportLinkModal(),
          'cmd-theme-light': () => { state.theme = 'light'; applyTheme(); },
          'cmd-theme-dark': () => { state.theme = 'dark'; applyTheme(); },
          'cmd-theme-sepia': () => { state.theme = 'sepia'; applyTheme(); },
          'cmd-settings': () => { location.hash = '#/settings'; },
        };
        close();
        cmds[it.id]?.();
      } else {
        close();
        location.hash = `#/entity/${encodeURIComponent(it.id)}`;
      }
    }

    input.addEventListener('input', () => { activeIndex = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(items.length - 1, activeIndex + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); execute(activeIndex); }
      else if (e.key === 'Escape') { close(); }
    });

    const close = () => {
      root.innerHTML = '';
      document.removeEventListener('keydown', onGlobalKey);
    };
    const onGlobalKey = (e) => {
      if (e.key === 'Escape' && root.innerHTML) close();
    };
    document.addEventListener('keydown', onGlobalKey);

    // Click outside to close
    $('.cmdk-backdrop').addEventListener('click', (e) => {
      if (e.target.classList.contains('cmdk-backdrop')) close();
    });

    // Preload entities
    Promise.all([
      api.list('person').then((d) => state.entities.person = d),
      api.list('task').then((d) => state.entities.task = d),
      api.list('project').then((d) => state.entities.project = d),
      api.list('link').then((d) => state.entities.link = d),
    ]).then(() => render()).catch(() => render());

    setTimeout(() => input.focus(), 30);
  }

  function setupCmdK() {
    $('#cmdk-btn').addEventListener('click', openCmdK);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCmdK();
      }
    });
  }

  // ============================ Theme =================================
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem('sb-theme', state.theme);
  }
  function setupTheme() {
    applyTheme();
    $('#theme-toggle').addEventListener('click', () => {
      const themes = ['light', 'dark', 'sepia'];
      const next = themes[(themes.indexOf(state.theme) + 1) % themes.length];
      state.theme = next;
      applyTheme();
      toast(`主题：${next === 'light' ? '浅色' : next === 'dark' ? '深色' : '复古'}`, 'info');
    });
  }

  // ============================ Cockpit Bridge ========================
  // v0.4.c1 — expose internal renderers so cockpit.js can reuse them
  // and install a cockpit-aware boot when ?cockpit=1 is set.
  window.__appState = state;
  window.__renderDashboard = renderDashboard;
  window.__renderTasks = renderTasks;
  window.__renderPeople = renderPeople;
  window.__renderProjects = renderProjects;
  window.__renderLinks = renderLinks;
  window.__refreshCounts = refreshCounts;
  window.openQuickAdd = openQuickAdd;
  window.openImportLinkModal = openImportLinkModal;
  window.openCmdK = openCmdK;
  window.__toggleTheme = () => {
    const themes = ['light', 'dark', 'sepia'];
    const next = themes[(themes.indexOf(state.theme) + 1) % themes.length];
    state.theme = next;
    applyTheme();
    localStorage.setItem('sb-theme', state.theme);
    toast(`主题：${next === 'light' ? '浅色' : next === 'dark' ? '深色' : '复古'}`, 'info');
  };

  // Cockpit entry point: when ?cockpit=1 is set, swap the standard layout
  // for the cockpit shell and route via cockpit.renderContent().
  async function cockpitRoute() {
    if (!window.__cockpit) return handleRoute();
    const hash = location.hash || '#/dashboard';
    const route = hash.replace('#/', '').split('?')[0];
    const impl = routeImplFor(route);
    if (window.__refreshCounts) {
      window.__refreshCounts().catch((e) => console.warn('[app] refreshCounts failed:', e.message));
    }
    await window.__cockpit.renderContent(impl, hash);
  }

  window.__appRouteImpl = (route) => {
    if (!route || route === 'dashboard' || route === '') return 'dashboard';
    if (route === 'tasks') return 'tasks';
    if (route === 'resources') return 'links';
    if (route === 'links') return 'links';
    if (route === 'people' || route === 'projects') return 'soon';
    if (route === 'tags') return 'tags';
    if (route === 'review') return 'review';
    if (route === 'knowledge') return 'knowledge';
    if (route === 'templates') return 'templates';
    if (route === 'agent') return 'agent';
    if (route === 'settings') return 'settings';
    if (route === 'review') return 'review';
    if (route === 'schedule') return 'schedule';
    if (route === 'notes') return 'notes';
    return 'soon';
  };
  function routeImplFor(route) {
    if (!route || route === 'dashboard' || route === '') return 'dashboard';
    if (route === 'tasks') return 'tasks';
    if (route === 'resources') return 'links';
    if (route === 'links') return 'links';
    if (route === 'people' || route === 'projects') return 'soon';
    if (route === 'tags') return 'tags';
    if (route === 'review') return 'review';
    if (route === 'knowledge') return 'knowledge';
    if (route === 'templates') return 'templates';
    if (route === 'agent') return 'agent';
    if (route === 'settings') return 'settings';
    if (route === 'schedule') return 'schedule';
    if (route === 'notes') return 'notes';
    return 'soon';
  }

  window.__bootCockpit = async function bootCockpit() {
    setupMarked();
    setupSearch();
    setupTheme();
    setupCmdK();
    if (window.__wikilinkAutocomplete) window.__wikilinkAutocomplete.init();
    try {
      state.config = await api.config.get();
    } catch (err) {
      toast('加载配置失败：' + err.message, 'error');
    }
    // Pre-load entities so the cockpit today panel has data to render.
    if (api.list) {
      api.list().then((items) => {
        const buckets = { person: [], task: [], project: [], link: [] };
        for (const it of items) (buckets[it.type] || buckets.link).push(it);
        state.entities = buckets;
        // Re-render with the current route, not hardcoded 'dashboard'.
        // Otherwise navigating to /#/schedule before entities load would
        // be silently flipped back to dashboard.
        if (window.__cockpit && window.__cockpit.renderContent) {
          const hash = location.hash || '#/dashboard';
          const route = hash.replace('#/', '').split('?')[0];
          const impl = (window.__appRouteImpl || ((r) => 'dashboard'))(route);
          window.__cockpit.renderContent(impl, hash);
        }
      }).catch((e) => console.warn('[app] entity pre-load failed:', e.message));
    }
    if (window.__cockpit) {
      console.log('[app] calling renderShell');
      window.__cockpit.renderShell();
      if (window.__cockpit.refreshVaultName) window.__cockpit.refreshVaultName();
      console.log('[app] renderShell done');
    } else {
      console.warn('[app] __cockpit not defined!');
    }
    window.removeEventListener('hashchange', handleRoute);
    window.addEventListener('hashchange', cockpitRoute);
    if (!location.hash) location.hash = '#/dashboard';
    console.log('[app] calling cockpitRoute, hash=', location.hash);
    await cockpitRoute();
    console.log('[app] bootCockpit END');
  };
  // ============================ Bootstrap =============================
  async function boot() {
    setupMarked();
    setupSearch();
    setupTheme();
    setupCmdK();
    if (window.__wikilinkAutocomplete) window.__wikilinkAutocomplete.init();
    renderSidebar();
    try {
      state.config = await api.config.get();
      window.__appState = state;
    } catch (err) {
      toast('加载配置失败：' + err.message, 'error');
    }
    if (!location.hash) location.hash = '#/dashboard';
    await handleRoute();
  }

  document.addEventListener("DOMContentLoaded", () => { if (window.__cockpitAutoBoot && window.__cockpitAutoBoot()) window.__bootCockpit(); else boot(); });
})();
