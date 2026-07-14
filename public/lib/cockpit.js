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

  // v0.4.6: state moved to public/lib/state.js (window.__state)
  const { state } = window.__state;

  const NAV_PRIMARY = [
    { hash: '#/dashboard', label: '今日', icon: 'home', impl: 'dashboard' },
    { hash: '#/notes', label: '笔记库', icon: 'note', impl: 'notes' },
    { hash: '#/knowledge', label: '知识图谱', icon: 'graph', impl: 'knowledge' },
    { hash: '#/tasks', label: '任务', icon: 'check', impl: 'tasks' },
    { hash: '#/schedule', label: '日程', icon: 'calendar', impl: 'schedule' },
    { hash: '#/review', label: '回顾', icon: 'eye', impl: 'review' },
  ];
  const NAV_RESOURCES = [
    { hash: '#/resources', label: '资源库', icon: 'folder', impl: 'links' },
    { hash: '#/templates', label: '模板', icon: 'copy', impl: 'templates' },
    { hash: '#/tags', label: '标签', icon: 'tag', impl: 'tags' },
    { hash: '#/agent', label: '智能体', icon: 'sparkle', impl: 'soon' },
    { hash: '#/settings', label: '设置', icon: 'settings', impl: 'settings' },
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
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3v1h6v-1c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><path d="M12 7v5l4 2"/>',
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

    // -------------------- Bottom row helpers (v0.4.c5) --------------------
  function captures(state) {
    const all = [];
    const e = state && state.entities;
    if (!e) return all;
    for (const type of ['person', 'task', 'project', 'link']) {
      for (const item of (e[type] || [])) {
        if (item.data && (item.data.captured === true || item.data.status === 'inbox')) {
          all.push({ ...item, _type: type });
        }
      }
    }
    return all.slice(0, 6);
  }
  function bookmarks(state) {
    const links = (state && state.entities && state.entities.link) || [];
    return links.filter((l) => l.data && l.data.bookmark === true).slice(0, 6);
  }
  function recentActivity(state) {
    const all = [];
    const e = state && state.entities;
    if (!e) return all;
    for (const type of ['person', 'task', 'project', 'link']) {
      for (const item of (e[type] || [])) {
        all.push({ ...item, _type: type });
      }
    }
    all.sort((a, b) => {
      const ua = (a.data && a.data.updated) || '';
      const ub = (b.data && b.data.updated) || '';
      return ub.localeCompare(ua);
    });
    return all.slice(0, 6);
  }
  function renderBottomRow(state) {
    const cap = captures(state);
    const bk = bookmarks(state);
    const rec = recentActivity(state);
    const capHtml = cap.length
      ? `<ul class="cockpit-list">${cap.map((t) => `<li><span class="cockpit-list-dot dot-${esc(t._type)}"></span><span class="cockpit-list-title">${esc(t.title || t.slug)}</span></li>`).join('')}</ul>`
      : `<p class="cockpit-block-empty">还没有捕获的想法。试试 ⌘N（v0.5 上线）。</p>`;
    const bkHtml = bk.length
      ? `<ul class="cockpit-list">${bk.map((l) => {
          const url = l.data && l.data.url;
          return `<li><span class="cockpit-list-dot dot-link"></span><a class="cockpit-list-title" href="${esc(url || '#')}" target="_blank" rel="noopener">${esc(l.title || l.slug)}</a>${url ? `<span class="cockpit-list-meta">${esc((() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } })())}</span>` : ''}</li>`;
        }).join('')}</ul>`
      : `<p class="cockpit-block-empty">还没有收藏的链接。编辑 link 时加 <code>bookmark: true</code>。</p>`;
    const recHtml = rec.length
      ? `<ul class="cockpit-list">${rec.map((t) => `<li><span class="cockpit-list-dot dot-${esc(t._type)}"></span><span class="cockpit-list-title">${esc(t.title || t.slug)}</span><span class="cockpit-list-meta">${esc((t.data && t.data.updated) || '').slice(0, 10)}</span></li>`).join('')}</ul>`
      : `<p class="cockpit-block-empty">还没有任何 entry。</p>`;
    return [
      '<section class="cockpit-bottom-row">',
        '<div class="cockpit-bottom-grid">',
          '<article class="cockpit-today-block block-captures">',
            '<header class="cockpit-block-header">',
              '<span class="cockpit-block-icon">' + icon('bulb', 14) + '</span>',
              '<h2 class="cockpit-block-title">捕获的想法</h2>',
              '<span class="cockpit-block-count">' + cap.length + '</span>',
            '</header>',
            '<div class="cockpit-block-body">' + capHtml + '</div>',
          '</article>',
          '<article class="cockpit-today-block block-bookmarks">',
            '<header class="cockpit-block-header">',
              '<span class="cockpit-block-icon">' + icon('bookmark', 14) + '</span>',
              '<h2 class="cockpit-block-title">收藏与书签</h2>',
              '<span class="cockpit-block-count">' + bk.length + '</span>',
            '</header>',
            '<div class="cockpit-block-body">' + bkHtml + '</div>',
          '</article>',
          '<article class="cockpit-today-block block-recent">',
            '<header class="cockpit-block-header">',
              '<span class="cockpit-block-icon">' + icon('history', 14) + '</span>',
              '<h2 class="cockpit-block-title">记忆回顾</h2>',
              '<span class="cockpit-block-count">' + rec.length + '</span>',
            '</header>',
            '<div class="cockpit-block-body">' + recHtml + '</div>',
          '</article>',
        '</div>',
      '</section>'
    ].join('');
  }

    // -------------------- Schedule helpers (v0.4.c6) --------------------
  function scheduleBuckets(state) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    const tomorrow = new Date(today.getTime() + dayMs);
    const weekEnd = new Date(today.getTime() + 7 * dayMs);
    const buckets = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [] };
    const push = (item, date) => {
      const d = parseDateOnly(date);
      if (!d) return;
      if (d < today) buckets.overdue.push({ item, d });
      else if (d.getTime() === today.getTime()) buckets.today.push({ item, d });
      else if (d.getTime() === tomorrow.getTime()) buckets.tomorrow.push({ item, d });
      else if (d < weekEnd) buckets.thisWeek.push({ item, d });
      else buckets.later.push({ item, d });
    };
    const e = state && state.entities;
    if (e) {
      for (const t of (e.task || [])) {
        if (t.data && t.data.due) push(t, t.data.due);
      }
      for (const p of (e.project || [])) {
        if (p.data && (p.data.deadline || p.data.due)) push(p, p.data.deadline || p.data.due);
      }
    }
    for (const k of Object.keys(buckets)) buckets[k].sort((a, b) => a.d - b.d);
    return buckets;
  }
  function fmtDayLabel(d, today) {
    const dayMs = 86400000;
    const diff = Math.round((d - today) / dayMs);
    if (diff < 0) return '已逾期 ' + (-diff) + ' 天';
    if (diff === 0) return '今天';
    if (diff === 1) return '明天';
    if (diff < 7) return diff + ' 天后';
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  }
  function renderSchedule(state) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets = scheduleBuckets(state);
    const sections = [
      { key: 'overdue', label: '已逾期', accent: 'danger' },
      { key: 'today', label: '今天', accent: 'accent' },
      { key: 'tomorrow', label: '明天', accent: 'soft' },
      { key: 'thisWeek', label: '本周内', accent: 'soft' },
      { key: 'later', label: '之后', accent: 'faint' },
    ];
    const totalCount = Object.values(buckets).reduce((s, b) => s + b.length, 0);
    if (totalCount === 0) {
      return [
        '<div class="cockpit-schedule">',
          '<div class="cockpit-schedule-empty">',
            icon('calendar', 28),
            '<h2>还没有日程</h2>',
            '<p>给 task 加 <code>due: 2026-01-01</code>、给 project 加 <code>deadline: 2026-01-01</code> 就会出现。</p>',
          '</div>',
        '</div>'
      ].join('');
    }
    const sectionHtml = sections.map(s => {
      const items = buckets[s.key];
      if (items.length === 0) return '';
      const itemsHtml = items.map(({ item, d }) => {
        const isTask = item.type === 'task' || (item.data && item.data.type === 'task');
        const dotClass = d < today ? 'dot-task-overdue' : (isTask ? 'dot-task-overdue' : 'dot-project');
        const title = item.title || item.slug;
        const type = item.type || (item.data && item.data.type) || '';
        const status = item.data && item.data.status;
        const isDone = status === 'done' || status === '已完成';
        return [
          '<li class="cockpit-schedule-item' + (isDone ? ' is-done' : '') + '">',
            '<span class="cockpit-list-dot ' + dotClass + '"></span>',
            '<span class="cockpit-schedule-day">' + esc(fmtDayLabel(d, today)) + '</span>',
            '<span class="cockpit-schedule-title">' + esc(title) + '</span>',
            type ? '<span class="cockpit-schedule-type">' + esc(type) + '</span>' : '',
          '</li>'
        ].join('');
      }).join('');
      return [
        '<section class="cockpit-schedule-section accent-' + s.accent + '">',
          '<header class="cockpit-schedule-header">',
            '<h2 class="cockpit-schedule-title">' + esc(s.label) + '</h2>',
            '<span class="cockpit-schedule-count">' + items.length + '</span>',
          '</header>',
          '<ul class="cockpit-schedule-list">' + itemsHtml + '</ul>',
        '</section>'
      ].join('');
    }).join('');
    return [
      '<div class="cockpit-schedule">',
        '<header class="cockpit-schedule-hero">',
          icon('calendar', 24),
          '<div>',
            '<h1>日程</h1>',
            '<p>' + totalCount + ' 项即将到来或逾期。聚焦最近 7 天，更远的在"之后"。</p>',
          '</div>',
        '</header>',
        sectionHtml,
      '</div>'
    ].join('');
  }

    // -------------------- Notes section (v0.4.c6) --------------------
  function renderNotes(state) {
    const e = state && state.entities;
    const groups = [
      { type: 'person', label: '人物', count: (e && e.person && e.person.length) || 0 },
      { type: 'task', label: '任务', count: (e && e.task && e.task.length) || 0 },
      { type: 'project', label: '项目', count: (e && e.project && e.project.length) || 0 },
      { type: 'link', label: '链接', count: (e && e.link && e.link.length) || 0 },
    ];
    const totalCount = groups.reduce((s, g) => s + g.count, 0);
    if (totalCount === 0) {
      return [
        '<div class="cockpit-notes">',
          '<div class="cockpit-notes-empty">',
            icon('note', 28),
            '<h2>笔记库是空的</h2>',
            '<p>新建一个 entry 开始吧。</p>',
          '</div>',
        '</div>'
      ].join('');
    }
    const typeLabels = { person: '人物', task: '任务', project: '项目', link: '链接' };
    const sectionHtml = groups.filter(g => g.count > 0).map(g => {
      const items = (e[g.type] || []).slice().sort((a, b) => {
        const ua = (a.data && a.data.updated) || '';
        const ub = (b.data && b.data.updated) || '';
        return ub.localeCompare(ua);
      });
      const itemsHtml = items.map(item => {
        const title = item.title || item.slug;
        const type = item.type;
        const tags = (item.data && item.data.tags) || [];
        const tagHtml = tags.length
          ? '<span class="cockpit-notes-tags">' + tags.slice(0, 3).map(t => '<span class="cockpit-tag">' + esc(t) + '</span>').join('') + '</span>'
          : '';
        return [
          '<a class="cockpit-notes-item" href="#/entity/' + esc(item.id) + '">',
            '<span class="cockpit-list-dot dot-' + esc(type) + '"></span>',
            '<span class="cockpit-notes-title">' + esc(title) + '</span>',
            tagHtml,
            '<span class="cockpit-list-meta">' + esc(((item.data && item.data.updated) || '').slice(0, 10)) + '</span>',
          '</a>'
        ].join('');
      }).join('');
      return [
        '<section class="cockpit-notes-section type-' + esc(g.type) + '">',
          '<header class="cockpit-notes-header">',
            '<h2 class="cockpit-notes-title">' + esc(g.label) + '</h2>',
            '<span class="cockpit-notes-count">' + g.count + '</span>',
          '</header>',
          '<div class="cockpit-notes-list">' + itemsHtml + '</div>',
        '</section>'
      ].join('');
    }).join('');
    return [
      '<div class="cockpit-notes">',
        '<header class="cockpit-notes-hero">',
          icon('note', 24),
          '<div>',
            '<h1>笔记库</h1>',
            '<p>' + totalCount + ' 个 entry，按类型分组。最近修改的排前面。</p>',
          '</div>',
        '</header>',
        sectionHtml,
      '</div>'
    ].join('');
  }

    // -------------------- Tags helpers (v0.4.c8) --------------------
  function collectAllTags(state) {
    // Build a { tagName: [items] } map across all entity types.
    const out = {};
    const e = state && state.entities;
    if (!e) return out;
    for (const type of ['person', 'task', 'project', 'link']) {
      for (const item of (e[type] || [])) {
        const tags = (item.data && item.data.tags) || [];
        for (const t of tags) {
          if (!t) continue;
          if (!out[t]) out[t] = [];
          out[t].push({ ...item, _type: type });
        }
      }
    }
    return out;
  }
  function renderTags(state) {
    const all = collectAllTags(state);
    const totalTags = Object.keys(all).length;
    const totalItems = Object.values(all).reduce((s, arr) => s + arr.length, 0);
    if (totalTags === 0) {
      return [
        '<div class="cockpit-tags">',
          '<div class="cockpit-tags-empty">',
            icon('tag', 28),
            '<h2>还没有标签</h2>',
            '<p>编辑 entity 时加 <code>tags: [a, b, c]</code> 就会出现。</p>',
          '</div>',
        '</div>'
      ].join('');
    }
    // Sort tags by count desc, then alphabetically
    const sortedTags = Object.entries(all).sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return a[0].localeCompare(b[0]);
    });
    const tagCloudHtml = sortedTags.map(([tag, items]) => {
      return '<button class="cockpit-tag-chip" data-tag="' + esc(tag) + '">' +
        '<span class="cockpit-tag-name">#' + esc(tag) + '</span>' +
        '<span class="cockpit-tag-count">' + items.length + '</span>' +
        '</button>';
    }).join('');
    return [
      '<div class="cockpit-tags">',
        '<header class="cockpit-tags-hero">',
          icon('tag', 24),
          '<div>',
            '<h1>标签</h1>',
            '<p>' + totalTags + ' 个标签，跨 ' + totalItems + ' 个 entry。点击标签查看相关 entries。</p>',
          '</div>',
        '</header>',
        '<div class="cockpit-tag-cloud" id="cockpit-tag-cloud">' + tagCloudHtml + '</div>',
        '<div class="cockpit-tag-entities" id="cockpit-tag-entities"></div>',
      '</div>'
    ].join('');
  }
  // After renderTags sets innerHTML, attach click handlers for filtering.
  // This is called from the caller after setting innerHTML — wraps the DOM.
  function bindTagClicks(content) {
    const chips = content.querySelectorAll('.cockpit-tag-chip');
    const target = content.querySelector('#cockpit-tag-entities');
    if (!chips.length || !target) return;
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const isActive = chip.classList.toggle('is-active');
        if (!isActive) {
          chip.classList.remove('is-active');
        }
        // Recompute selected tags and re-render the entities panel.
        const selected = Array.from(content.querySelectorAll('.cockpit-tag-chip.is-active'))
          .map((c) => c.dataset.tag);
        if (selected.length === 0) {
          target.innerHTML = '<p class="cockpit-block-empty">点击上面的标签查看相关 entries</p>';
          return;
        }
        const all = collectAllTags(window.__state.state);
        const matching = new Set();
        for (const t of selected) {
          for (const it of (all[t] || [])) matching.add(it);
        }
        const items = Array.from(matching).sort((a, b) => {
          const ua = (a.data && a.data.updated) || '';
          const ub = (b.data && b.data.updated) || '';
          return ub.localeCompare(ua);
        });
        const itemsHtml = items.map((it) => {
          const title = it.title || it.slug;
          return '<a class="cockpit-notes-item" href="#/entity/' + esc(it.id) + '">' +
            '<span class="cockpit-list-dot dot-' + esc(it._type) + '"></span>' +
            '<span class="cockpit-notes-title">' + esc(title) + '</span>' +
            '<span class="cockpit-list-meta">' + esc(((it.data && it.data.updated) || '').slice(0, 10)) + '</span>' +
            '</a>';
        }).join('');
        target.innerHTML = [
          '<div class="cockpit-tag-results-header">',
            '<span>显示 ' + items.length + ' 个 entry</span>',
            '<button class="cockpit-tag-clear" data-action="clear-tags">清除筛选</button>',
          '</div>',
          '<div class="cockpit-notes-list">' + itemsHtml + '</div>',
        ].join('');
        // Wire the clear button
        const clearBtn = target.querySelector('[data-action="clear-tags"]');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            chips.forEach((c) => c.classList.remove('is-active'));
            target.innerHTML = '<p class="cockpit-block-empty">点击上面的标签查看相关 entries</p>';
          });
        }
      });
    });
  }

    // -------------------- Review helpers (v0.4.c6.回顾) --------------------
  function reviewBuckets(state) {
    // Last 7 days of activity, grouped by day. Each bucket is a date
    // (YYYY-MM-DD) and a list of items updated on that day.
    const now = new Date();
    const dayMs = 86400000;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const horizon = today.getTime() - 7 * dayMs; // 7 days back, midnight
    const buckets = []; // [{ date: Date, label: '今天' | '昨天' | 'N 天前' | 'M月D日', items: [items] }]
    for (let i = 0; i < 7; i++) {
      const day = new Date(today.getTime() - i * dayMs);
      buckets.push({ date: day, items: [] });
    }
    const labelFor = (day) => {
      if (day.getTime() === today.getTime()) return '今天';
      if (day.getTime() === today.getTime() - dayMs) return '昨天';
      const diff = Math.round((today.getTime() - day.getTime()) / dayMs);
      return diff + ' 天前';
    };
    const e = state && state.entities;
    if (e) {
      for (const type of ['person', 'task', 'project', 'link']) {
        for (const item of (e[type] || [])) {
          const upd = (item.data && item.data.updated) || '';
          if (!upd) continue;
          const t = new Date(upd);
          if (isNaN(t.getTime())) continue;
          const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
          if (dayStart < horizon) continue;
          for (const b of buckets) {
            if (b.date.getTime() === dayStart) {
              b.items.push({ ...item, _type: type });
              break;
            }
          }
        }
      }
    }
    // Sort each bucket by updated desc
    for (const b of buckets) {
      b.items.sort((a, b2) => {
        const ua = (a.data && a.data.updated) || '';
        const ub = (b2.data && b2.data.updated) || '';
        return ub.localeCompare(ua);
      });
    }
    return buckets.map((b) => ({ ...b, label: labelFor(b.date) }));
  }
  function topTagsThisWeek(state) {
    // Count tag usage across entities updated in the last 7 days.
    const now = new Date();
    const dayMs = 86400000;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const horizon = today.getTime() - 7 * dayMs;
    const counts = {};
    const e = state && state.entities;
    if (!e) return [];
    for (const type of ['person', 'task', 'project', 'link']) {
      for (const item of (e[type] || [])) {
        const upd = (item.data && item.data.updated) || '';
        if (!upd) continue;
        const t = new Date(upd);
        if (isNaN(t.getTime())) continue;
        const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
        if (dayStart < horizon) continue;
        for (const tag of (item.data && item.data.tags) || []) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }
  function renderReview(state) {
    const buckets = reviewBuckets(state);
    const topTags = topTagsThisWeek(state);
    const totalUpdates = buckets.reduce((s, b) => s + b.items.length, 0);
    if (totalUpdates === 0 && topTags.length === 0) {
      return [
        '<div class="cockpit-review">',
          '<div class="cockpit-review-empty">',
            icon('history', 28),
            '<h2>过去 7 天没有任何活动</h2>',
            '<p>新建一个 entry 就会出现在这里。</p>',
          '</div>',
        '</div>'
      ].join('');
    }
    const daySections = buckets.filter(b => b.items.length > 0).map(b => {
      const itemsHtml = b.items.map(item => {
        const title = item.title || item.slug;
        return '<a class="cockpit-notes-item" href="#/entity/' + esc(item.id) + '">' +
          '<span class="cockpit-list-dot dot-' + esc(item._type) + '"></span>' +
          '<span class="cockpit-notes-title">' + esc(title) + '</span>' +
          '<span class="cockpit-list-meta">' + esc(((item.data && item.data.updated) || '').slice(11, 16)) + '</span>' +
        '</a>';
      }).join('');
      return [
        '<section class="cockpit-review-day">',
          '<header class="cockpit-review-day-header">',
            '<h2 class="cockpit-review-day-title">' + esc(b.label) + '</h2>',
            '<span class="cockpit-review-day-count">' + b.items.length + '</span>',
          '</header>',
          '<div class="cockpit-notes-list">' + itemsHtml + '</div>',
        '</section>'
      ].join('');
    }).join('');
    const tagCloudHtml = topTags.length
      ? '<div class="cockpit-review-tags">' + topTags.map(([t, n]) =>
        '<span class="cockpit-review-tag-chip">#' + esc(t) + '<span class="cockpit-review-tag-count">' + n + '</span></span>'
      ).join('') + '</div>'
      : '<p class="cockpit-block-empty">过去 7 天没有标签活动。</p>';
    return [
      '<div class="cockpit-review">',
        '<header class="cockpit-review-hero">',
          icon('history', 24),
          '<div>',
            '<h1>回顾</h1>',
            '<p>过去 7 天 ' + totalUpdates + ' 次更新。按时段分组，最热门的标签：</p>',
          '</div>',
        '</header>',
        '<section class="cockpit-review-section-block">',
          '<header class="cockpit-block-header">',
            '<span class="cockpit-block-icon">' + icon('tag', 14) + '</span>',
            '<h2 class="cockpit-block-title">热门标签（过去 7 天）</h2>',
          '</header>',
          tagCloudHtml,
        '</section>',
        daySections,
      '</div>'
    ].join('');
  }

    // -------------------- Settings (v0.4.5) --------------------
  function renderSettings(state) {
    const cfg = state.config || (window.__state && window.__state.state && window.__state.state.config) || {};
    return [
      '<div class="cockpit-settings">',
        '<header class="cockpit-settings-hero">',
          icon('settings', 24),
          '<div>',
            '<h1>设置</h1>',
            '<p>修改 Vault 路径、监听端口和地址。保存后需要重启服务才能生效。</p>',
          '</div>',
        '</header>',
        '<form class="cockpit-settings-form" id="cockpit-settings-form">',
          '<div class="cockpit-settings-row">',
            '<label>Vault 路径</label>',
            '<input type="text" id="cfg-vaultPath" value="' + esc(cfg.vaultPath || '') + '" placeholder="/path/to/Obsidian Vault" />',
          '</div>',
          '<div class="cockpit-settings-row">',
            '<label>监听端口</label>',
            '<input type="number" id="cfg-port" value="' + (cfg.port || 3939) + '" />',
          '</div>',
          '<div class="cockpit-settings-row">',
            '<label>监听地址</label>',
            '<input type="text" id="cfg-host" value="' + esc(cfg.host || '127.0.0.1') + '" />',
          '</div>',
          '<div class="cockpit-settings-row">',
            '<label>directories</label>',
            '<div class="cockpit-settings-dirs" id="cfg-directories-display">',
              renderDirsDisplay(cfg.directories || {}),
            '</div>',
          '</div>',
          '<div class="cockpit-settings-actions">',
            '<button type="submit" class="btn btn-primary" id="cfg-save">保存</button>',
            '<button type="button" class="btn" id="cfg-reload">重载</button>',
          '</div>',
        '</form>',
      '</div>'
    ].join('');
  }
  function renderDirsDisplay(dirs) {
    return Object.entries(dirs).map(([type, dir]) => {
      return '<div class="cockpit-settings-dir-row">' +
        '<span class="cockpit-settings-dir-type">' + esc(type) + '</span>' +
        '<span class="cockpit-settings-dir-arrow">→</span>' +
        '<code class="cockpit-settings-dir-path">' + esc(dir) + '</code>' +
      '</div>';
    }).join('');
  }
  // Wire form submission after the form is in the DOM.
  function bindSettingsForm(content) {
    const form = content.querySelector('#cockpit-settings-form');
    if (!form) return;
    const submit = (ev) => {
      ev.preventDefault();
      const vaultPath = content.querySelector('#cfg-vaultPath').value.trim();
      const port = parseInt(content.querySelector('#cfg-port').value, 10) || null;
      const host = content.querySelector('#cfg-host').value.trim();
      if (!vaultPath) {
        if (window.__appToast) window.__appToast('Vault 路径不能为空', 'error');
        return;
      }
      // Build body matching what api.config.put expects.
      const body = { vaultPath };
      if (!isNaN(port) && port) body.port = port;
      if (host) body.host = host;
      if (window.__appApi && window.__appApi.api && window.__appApi.api.config) {
        window.__appApi.api.config.put(body).then((next) => {
          if (next) {
            if (window.__state) window.__state.state.config = next;
            if (window.__appToast) window.__appToast('已保存。重启服务后端口/地址生效。', 'success');
            if (window.__cockpit && window.__cockpit.refreshVaultName) {
              window.__cockpit.refreshVaultName();
            }
          }
        }).catch((err) => {
          if (window.__appToast) window.__appToast(err.message || String(err), 'error');
        });
      }
    };
    const reload = () => {
      // Re-render by re-routing to /settings.
      location.hash = '#/dashboard';
      setTimeout(() => { location.hash = '#/settings'; }, 50);
    };
    form.addEventListener('submit', submit);
    const reloadBtn = content.querySelector('#cfg-reload');
    if (reloadBtn) reloadBtn.addEventListener('click', reload);
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
        renderBottomRow(state),
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
  let movedMain = false;
  let movedTitle = false;
  function adoptV3Elements(overlay) {
    const cockpitContent = overlay.querySelector('#cockpit-content');
    // Move <main id="main"> into cockpit-content so v3 renderers
    // (renderTasks, renderLinks) can write to #main.innerHTML.
    // Skip if already inside cockpit-content. Retry on every call:
    // if #main didn't exist yet (race with app.js boot), try again next call.
    if (!movedMain) {
      const v3Main = document.getElementById('main');
      if (v3Main && cockpitContent && v3Main.parentElement !== cockpitContent) {
        v3Main.classList.add('cockpit-main-host');
        cockpitContent.appendChild(v3Main);
        movedMain = true;
      }
    }
    if (!movedTitle) {
      const v3PageTitle = document.getElementById('page-title');
      const cockpitTitle = overlay.querySelector('#cockpit-title');
      if (v3PageTitle && cockpitTitle) {
        v3PageTitle.style.display = 'none';
        const sync = () => { cockpitTitle.textContent = v3PageTitle.textContent || cockpitTitle.textContent; };
        new MutationObserver(sync).observe(v3PageTitle, { childList: true, characterData: true, subtree: true });
        sync();
        movedTitle = true;
      }
    }
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

  // -------------------- Templates (v0.4.c6.模板) --------------------
  // Pre-defined starter templates per entity type. Each template pre-fills
  // the body + tags when the user picks it from the cockpit Templates page
  // or from the quick-add flow. Templates live in JS, not in the vault,
  // because they should be available even when the vault is empty.
  const TEMPLATES = {
    person: [
      {
        id: 'person-colleague',
        name: '同事',
        emoji: '💼',
        description: '工作关系,记下职责、Slack、协作历史。',
        tags: ['colleague', 'work'],
        body: [
          '## 联系方式',
          '',
          '- Slack:',
          '- Email:',
          '',
          '## 协作记录',
          '',
          '- ',
          '',
        ].join('\n'),
      },
      {
        id: 'person-friend',
        name: '朋友',
        emoji: '🤝',
        description: '私人关系,什么时候认识、共同回忆。',
        tags: ['friend', 'personal'],
        body: [
          '我们是在 [地点 / 活动] 认识的。',
          '',
          '- 共同点:',
          '- 上次见面:',
          '',
        ].join('\n'),
      },
      {
        id: 'person-family',
        name: '家人',
        emoji: '🏠',
        description: '家人 / 亲戚,记生日、爱好、最近的事。',
        tags: ['family', 'personal'],
        body: [
          '## 基础信息',
          '',
          '- 生日:',
          '- 爱好:',
          '',
          '## 最近',
          '',
          '- ',
          '',
        ].join('\n'),
      },
    ],
    task: [
      {
        id: 'task-default',
        name: '默认任务',
        emoji: '✅',
        description: '通用任务,默认 open 状态、中优先级。',
        tags: ['work'],
        body: [
          '## 上下文',
          '',
          '',
          '## 步骤',
          '',
          '- [ ] ',
          '',
        ].join('\n'),
      },
      {
        id: 'task-retro',
        name: '复盘',
        emoji: '🔁',
        description: '事后总结,记录做得好的、做得不好的、下次改什么。',
        tags: ['planning', 'reflection'],
        body: [
          '## 做得好的',
          '',
          '- ',
          '',
          '## 做得不好的',
          '',
          '- ',
          '',
          '## 下次改',
          '',
          '- ',
          '',
        ].join('\n'),
      },
      {
        id: 'task-meeting',
        name: '会议',
        emoji: '👥',
        description: '会议纪要,记录参与者、议题、决议、Action items。',
        tags: ['work', 'meeting'],
        body: [
          '## 参与者',
          '',
          '- ',
          '',
          '## 议题',
          '',
          '1. ',
          '',
          '## 决议',
          '',
          '- ',
          '',
          '## Action Items',
          '',
          '- [ ] ',
          '',
        ].join('\n'),
      },
    ],
    project: [
      {
        id: 'project-side',
        name: '副业项目',
        emoji: '🌱',
        description: '个人项目,记目标、当前状态、下一步。',
        tags: ['personal', 'side'],
        body: [
          '## 目标',
          '',
          '',
          '## 当前状态',
          '',
          '',
          '## 下一步',
          '',
          '- [ ] ',
          '',
        ].join('\n'),
      },
      {
        id: 'project-work',
        name: '工作项目',
        emoji: '🏢',
        description: '工作项目,记团队、里程碑、风险。',
        tags: ['work'],
        body: [
          '## 团队',
          '',
          '- ',
          '',
          '## 里程碑',
          '',
          '- [ ] ',
          '',
          '## 风险',
          '',
          '- ',
          '',
        ].join('\n'),
      },
      {
        id: 'project-research',
        name: '研究 / 探索',
        emoji: '🔬',
        description: '研究类项目,记假设、读到的资料、结论。',
        tags: ['research', 'learning'],
        body: [
          '## 假设',
          '',
          '',
          '## 读到的资料',
          '',
          '- ',
          '',
          '## 结论',
          '',
          '',
        ].join('\n'),
      },
    ],
    link: [
      {
        id: 'link-article',
        name: '文章',
        emoji: '📰',
        description: '想读 / 已读的文章,记核心观点、行动项。',
        tags: ['reading', 'article'],
        body: [
          '## 核心观点',
          '',
          '',
          '## 我的反应',
          '',
          '',
          '## 行动项',
          '',
          '- [ ] ',
          '',
        ].join('\n'),
      },
      {
        id: 'link-tool',
        name: '工具',
        emoji: '🛠️',
        description: '软件 / 库 / 服务,记用途、试用情况。',
        tags: ['tool'],
        body: [
          '## 用途',
          '',
          '',
          '## 试用情况',
          '',
          '- 安装:',
          '- 试过的功能:',
          '- 评价:',
          '',
        ].join('\n'),
      },
      {
        id: 'link-video',
        name: '视频',
        emoji: '🎬',
        description: '视频 / 播客,记关键时间戳、笔记。',
        tags: ['video'],
        body: [
          '## 时间戳',
          '',
          '- 00:00 —',
          '',
          '## 笔记',
          '',
          '',
        ].join('\n'),
      },
    ],
  };

  const TEMPLATE_TYPE_LABELS = {
    person: '人物', task: '任务', project: '项目', link: '链接',
  };

  // Group templates by type for the cockpit page
  function groupedTemplates() {
    const out = [];
    for (const type of ['person', 'task', 'project', 'link']) {
      const items = TEMPLATES[type] || [];
      if (items.length > 0) out.push({ type, label: TEMPLATE_TYPE_LABELS[type], items });
    }
    return out;
  }

  // Render the templates cockpit page
  function renderTemplates(state) {
    const groups = groupedTemplates();
    const totalCount = groups.reduce((s, g) => s + g.items.length, 0);
    if (totalCount === 0) {
      return [
        '<div class="cockpit-templates">',
          '<div class="cockpit-templates-empty">',
            icon('copy', 28),
            '<h2>模板库还没准备好</h2>',
            '<p>新建一个 entry 就能使用模板。</p>',
          '</div>',
        '</div>'
      ].join('');
    }
    const hero = [
      '<header class="cockpit-templates-hero">',
        icon('copy', 24),
        '<div>',
          '<h1>模板</h1>',
          '<p>' + totalCount + ' 个模板 · 4 种类型。点模板预览,然后「使用」直接新建 entry。</p>',
        '</div>',
      '</header>'
    ].join('');
    const groupsHtml = groups.map(g => {
      const cardsHtml = g.items.map(t => {
        const tagsHtml = (t.tags || []).map(tag => '<span class="cockpit-template-tag">#' + esc(tag) + '</span>').join('');
        return [
          '<article class="cockpit-template-card" data-template-id="' + esc(t.id) + '">',
            '<header class="cockpit-template-card-header">',
              '<span class="cockpit-template-emoji">' + esc(t.emoji) + '</span>',
              '<h3 class="cockpit-template-name">' + esc(t.name) + '</h3>',
            '</header>',
            '<p class="cockpit-template-desc">' + esc(t.description) + '</p>',
            '<div class="cockpit-template-tags">' + tagsHtml + '</div>',
            '<pre class="cockpit-template-body">' + esc(t.body) + '</pre>',
            '<div class="cockpit-template-actions">',
              '<button class="btn btn-primary btn-sm" data-template-use="' + esc(t.id) + '">使用模板</button>',
              '<button class="btn btn-ghost btn-sm" data-template-copy="' + esc(t.id) + '">复制 body</button>',
            '</div>',
          '</article>'
        ].join('');
      }).join('');
      return [
        '<section class="cockpit-template-group">',
          '<header class="cockpit-template-group-header">',
            '<h2>' + esc(g.label) + '</h2>',
            '<span class="cockpit-template-group-count">' + g.items.length + ' 个模板</span>',
          '</header>',
          '<div class="cockpit-template-grid">' + cardsHtml + '</div>',
        '</section>'
      ].join('');
    }).join('');
    return [
      '<div class="cockpit-templates">',
        hero,
        '<div class="cockpit-templates-groups">' + groupsHtml + '</div>',
      '</div>'
    ].join('');
  }

  // Wire template actions in the rendered template page
  function bindTemplateActions(content) {
    content.querySelectorAll('[data-template-use]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-template-use');
        const tpl = findTemplate(id);
        if (!tpl) return;
        // Pre-fill quick add: open modal with the template body pre-filled
        const title = window.prompt('使用模板「' + tpl.name + '」 — 请输入标题:', '');
        if (title == null || !title.trim()) return;
        createFromTemplate(tpl, title.trim());
      });
    });
    content.querySelectorAll('[data-template-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-template-copy');
        const tpl = findTemplate(id);
        if (!tpl) return;
        try {
          await navigator.clipboard.writeText(tpl.body);
          toast('已复制 body 到剪贴板', 'success');
        } catch (e) {
          toast('复制失败:' + e.message, 'error');
        }
      });
    });
  }

  function findTemplate(id) {
    for (const type of Object.keys(TEMPLATES)) {
      const t = TEMPLATES[type].find(x => x.id === id);
      if (t) return t;
    }
    return null;
  }

  function findTemplateType(id) {
    for (const type of Object.keys(TEMPLATES)) {
      if (TEMPLATES[type].find(x => x.id === id)) return type;
    }
    return null;
  }

  async function createFromTemplate(tpl, title) {
    const type = findTemplateType(tpl.id);
    if (!type) return;
    try {
      const created = await window.__api.create({ type, title, body: tpl.body, data: { tags: tpl.tags } });
      toast('已创建:' + title, 'success');
      // Navigate to the new entity
      if (created && created.id) {
        location.hash = '#/entity/' + created.id;
      } else {
        // Refresh the current route
        if (window.__appRouteImpl && window.__cockpit.renderContent) {
          window.__cockpit.renderContent('templates', location.hash);
        }
      }
    } catch (err) {
      toast('创建失败:' + err.message, 'error');
    }
  }

    // -------------------- Knowledge graph helpers (v0.4.c6.知识图谱) --------------------
  // Build a graph from wikilinks + shared tags. Two entities are connected if:
  //   - One has a wikilink to the other ([[type/slug]] or [[slug]])
  //   - They share at least one tag
  // Returns {nodes, edges, hubs} where hubs = entities sorted by degree.
  function buildGraph(state) {
    const e = state && state.entities;
    if (!e) return { nodes: [], edges: [], hubs: [] };
    const all = [];
    for (const type of ['person', 'task', 'project', 'link']) {
      for (const item of (e[type] || [])) {
        all.push({ ...item, _type: type });
      }
    }
    if (all.length === 0) return { nodes: [], edges: [], hubs: [] };
    // Map of id -> entity for wikilink resolution
    const byId = {};
    const bySlug = {};
    for (const it of all) {
      byId[it.id] = it;
      bySlug[`${it._type}/${it.slug}`] = it;
      bySlug[it.slug] = it; // fallback: bare slug
    }
    const titleOf = (it) => (it.data && (it.data.title || it.data.name)) || it.slug;
    const edges = new Map(); // "from|to" -> {reason}
    const addEdge = (from, to, reason) => {
      if (!from || !to || from.id === to.id) return;
      const key = [from.id, to.id].sort().join('|');
      if (!edges.has(key)) edges.set(key, { from: from.id, to: to.id, reasons: new Set() });
      edges.get(key).reasons.add(reason);
    };
    // Wikilink edges
    const wikiRe = /\[\[([^\]]+)\]\]/g;
    for (const it of all) {
      const body = it.body || '';
      let m;
      while ((m = wikiRe.exec(body)) !== null) {
        const target = m[1].trim();
        const resolved = bySlug[target];
        if (resolved) addEdge(it, resolved, 'wikilink');
      }
    }
    // Tag-overlap edges
    const tagToEntities = {};
    for (const it of all) {
      for (const tag of (it.data && it.data.tags) || []) {
        if (!tagToEntities[tag]) tagToEntities[tag] = [];
        tagToEntities[tag].push(it);
      }
    }
    for (const tag of Object.keys(tagToEntities)) {
      const bucket = tagToEntities[tag];
      if (bucket.length < 2) continue;
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          addEdge(bucket[i], bucket[j], `#${tag}`);
        }
      }
    }
    // Compute degree
    const degree = {};
    for (const it of all) degree[it.id] = 0;
    for (const e of edges.values()) {
      degree[e.from] = (degree[e.from] || 0) + 1;
      degree[e.to] = (degree[e.to] || 0) + 1;
    }
    const hubs = all
      .filter(it => degree[it.id] > 0)
      .sort((a, b) => degree[b.id] - degree[a.id]);
    // Build adjacency: for each entity, list of connected entities with reason labels
    const adjacency = {};
    for (const it of all) adjacency[it.id] = [];
    for (const e of edges.values()) {
      adjacency[e.from].push({ other: e.to, reasons: Array.from(e.reasons) });
      adjacency[e.to].push({ other: e.from, reasons: Array.from(e.reasons) });
    }
    return { nodes: all, edges: Array.from(edges.values()), hubs, degree, adjacency, titleOf, byId };
  }

  function renderKnowledge(state) {
    const g = buildGraph(state);
    if (g.nodes.length === 0) {
      return [
        '<div class="cockpit-knowledge">',
          '<div class="cockpit-knowledge-empty">',
            icon('graph', 28),
            '<h2>知识图谱还没有数据</h2>',
            '<p>新建一个 entry 就会出现在这里。</p>',
          '</div>',
        '</div>'
      ].join('');
    }
    const totalConnections = g.edges.length;
    const connectedNodes = g.hubs.length;
    // Hero
    const hero = [
      '<header class="cockpit-knowledge-hero">',
        icon('graph', 24),
        '<div>',
          '<h1>知识图谱</h1>',
          '<p>' + g.nodes.length + ' 个 entities · ' + totalConnections + ' 条连接 · ' + connectedNodes + ' 个有连接的节点</p>',
        '</div>',
      '</header>'
    ].join('');
    // Top hubs (top 5)
    const topHubs = g.hubs.slice(0, 5);
    const hubsHtml = topHubs.map(hub => {
      const title = g.titleOf(hub);
      const degree = g.degree[hub.id];
      const connections = g.adjacency[hub.id].slice(0, 8);
      const items = connections.map(c => {
        const other = g.byId[c.other];
        if (!other) return '';
        const otherTitle = g.titleOf(other);
        const reasons = c.reasons.slice(0, 2).join(', ');
        return '<a class="cockpit-knowledge-edge" href="#/entity/' + esc(other.id) + '">' +
          '<span class="cockpit-list-dot dot-' + esc(other._type) + '"></span>' +
          '<span class="cockpit-knowledge-edge-title">' + esc(otherTitle) + '</span>' +
          '<span class="cockpit-knowledge-edge-reason">' + esc(reasons) + '</span>' +
        '</a>';
      }).join('');
      const more = g.adjacency[hub.id].length > 8
        ? '<div class="cockpit-knowledge-more">+ ' + (g.adjacency[hub.id].length - 8) + ' 更多连接</div>'
        : '';
      return [
        '<section class="cockpit-knowledge-hub">',
          '<header class="cockpit-knowledge-hub-header">',
            '<a class="cockpit-knowledge-hub-title" href="#/entity/' + esc(hub.id) + '">',
              '<span class="cockpit-list-dot dot-' + esc(hub._type) + '"></span>',
              esc(title),
            '</a>',
            '<span class="cockpit-knowledge-hub-degree">' + degree + ' 条连接</span>',
          '</header>',
          '<div class="cockpit-knowledge-edges">' + items + '</div>',
          more,
        '</section>'
      ].join('');
    }).join('');
    // Type clusters
    const byType = { person: 0, task: 0, project: 0, link: 0 };
    for (const it of g.nodes) byType[it._type] = (byType[it._type] || 0) + 1;
    const clusterHtml = [
      '<section class="cockpit-knowledge-clusters">',
        '<h2>类型分布</h2>',
        '<div class="cockpit-knowledge-cluster-grid">',
          ['person', 'task', 'project', 'link'].map(t => {
            const labels = { person: '人物', task: '任务', project: '项目', link: '链接' };
            const n = byType[t] || 0;
            return '<div class="cockpit-knowledge-cluster cluster-' + t + '">' +
              '<span class="cockpit-knowledge-cluster-label">' + esc(labels[t]) + '</span>' +
              '<span class="cockpit-knowledge-cluster-count">' + n + '</span>' +
            '</div>';
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
    const main = connectedNodes === 0
      ? '<div class="cockpit-knowledge-empty"><p>没有任何连接。在 entry 里用 <code>[[type/slug]]</code> 互相引用,或者共享标签就能建图。</p></div>'
      : '<div class="cockpit-knowledge-hubs">' + hubsHtml + '</div>';
    return [
      '<div class="cockpit-knowledge">',
        hero,
        clusterHtml,
        main,
      '</div>'
    ].join('');
  }

    // Resolve the dynamic content target: prefer the adopted <main id="main">
  // (so v3 renderers like __renderTasks can write to #main.innerHTML).
  // Fall back to #cockpit-content for first-paint before adoption completes.
  function renderTarget() {
    return document.getElementById('main') || document.getElementById('cockpit-content');
  }

  async function renderContent(route, hash) {
    const content = renderTarget();
    if (!content) return;
    setActive(hash || location.hash || '#/dashboard');
    try {
      if (route === 'dashboard' || route === '' || !route) {
        content.innerHTML = renderTodayPanel();
        return;
      }
      if (route === 'tasks') { if (window.__renderTasks) await window.__renderTasks(); return; }
      if (route === 'links') { if (window.__renderLinks) await window.__renderLinks(); return; }
      if (route === 'schedule') {
        content.innerHTML = renderSchedule(state);
        return;
      }
      if (route === 'notes') {
        content.innerHTML = renderNotes(state);
        return;
      }
      if (route === 'tags') {
        content.innerHTML = renderTags(state);
        bindTagClicks(content);
        return;
      }
      if (route === 'settings') {
        content.innerHTML = renderSettings(state);
        bindSettingsForm(content);
        return;
      }
      if (route === 'review') {
        content.innerHTML = renderReview(state);
        return;
      }
      if (route === 'knowledge') {
        content.innerHTML = renderKnowledge(state);
        return;
      }
      if (route === 'templates') {
        content.innerHTML = renderTemplates(state);
        bindTemplateActions(content);
        return;
      }
      const map = [].concat(NAV_PRIMARY, NAV_RESOURCES).reduce((m, it) => (m[it.impl] = it.label, m), {});
      content.innerHTML = placeholder(map[route] || route, '该模块正在 v0.4 后续 issue 中实现。');
    } catch (err) {
      console.error('[cockpit] renderContent failed:', err);
      const t = renderTarget() || document.getElementById('cockpit-content');
      if (t) t.innerHTML = '<div class="cockpit-error">渲染失败：' + esc(err.message) + '</div>';
    }
  }

  window.__cockpit = { renderShell, renderContent, setActive, refreshVaultName, nav: { primary: NAV_PRIMARY, resources: NAV_RESOURCES } };
  window.__cockpitAutoBoot = () => {
    try { return new URLSearchParams(location.search).get('cockpit') === '1'; }
    catch { return false; }
  };
})();
