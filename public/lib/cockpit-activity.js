// v0.16 — Recent Activity cockpit component (extracted from cockpit.js).
//
// Loads the last 7 days of events from /api/events and renders a
// "近期活动" widget block. Pure HTML string output (no DOM mutation), so it
// composes with the existing cockpit.js render flow.
//
// Exposes: window.__cockpitActivity.{ renderRecentActivity, TYPE_LABELS, TYPE_DOTS }

(() => {
  'use strict';

  // Local HTML escape — matches the helpers in app.js / cockpit.js / wikilink.js.
  // Kept inline rather than shared so each module is self-contained.
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // Reuse the ICONS dict exposed by public/lib/icons.js so we render the
  // exact same SVG markup as cockpit.js (which has 'activity' as an empty
  // entry today). If icons.js hasn't loaded yet, fall back to a local stub.
  const ICONS = (window.__ICONS && window.__ICONS.ICONS) || {};
  function activityIcon(size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS['activity'] || '') +
      '</svg>';
  }

  // Event type → human-readable Chinese label.
  const TYPE_LABELS = {
    'task.created':   '任务 开了',
    'task.done':      '任务 完成',
    'task.updated':   '任务 更新',
    'task.deleted':   '任务 删除',
    'task.in_progress': '任务 进行',
    'project.created': '项目 开了',
    'project.done':   '项目 完成',
    'person.created': '人物 添加',
    'link.imported':  '链接 导入',
    'file.changed':   '文件 修改',
    'daily.generated':'日记 生成',
    'weekly.generated':'周报 生成',
    'decision.created':'决策 记录',
    'decision.updated':'决策 回顾',
  };

  // Event type → dot CSS class for color-coding.
  const TYPE_DOTS = {
    'task.created':   'dot-task',
    'task.done':      'dot-task',
    'task.updated':   'dot-task',
    'task.deleted':   'dot-task',
    'task.in_progress':'dot-task',
    'project.created':'dot-project',
    'project.done':   'dot-project',
    'person.created': 'dot-person',
    'link.imported':  'dot-link',
    'file.changed':   'dot-link',
    'daily.generated':'dot-project',
    'weekly.generated':'dot-project',
    'decision.created':'dot-decision',
    'decision.updated':'dot-decision',
  };

  function emptyState() {
    return [
      '<article class="cockpit-today-block block-activity">',
        '<header class="cockpit-block-header">',
          '<span class="cockpit-block-icon">' + activityIcon(14) + '</span>',
          '<h2 class="cockpit-block-title">近期活动</h2>',
          '<span class="cockpit-block-count">0</span>',
        '</header>',
        '<div class="cockpit-block-body">',
          '<p class="cockpit-block-empty">过去 7 天没有事件流。开始用 vault 之后会显示在这里。</p>',
        '</div>',
      '</article>'
    ].join('');
  }

  function block(title, count, body) {
    return [
      '<article class="cockpit-today-block block-activity">',
        '<header class="cockpit-block-header">',
          '<span class="cockpit-block-icon">' + activityIcon(14) + '</span>',
          '<h2 class="cockpit-block-title">' + escapeHtml(title) + '</h2>',
          '<span class="cockpit-block-count">' + escapeHtml(String(count)) + '</span>',
        '</header>',
        '<div class="cockpit-block-body">',
          body,
        '</div>',
      '</article>'
    ].join('');
  }

  function renderRow(event) {
    const type = event.type || '';
    const label = TYPE_LABELS[type] || type || '事件';
    const dotCls = TYPE_DOTS[type] || 'dot-task';
    const id = event.id || '';
    const title = event.title || '';
    const content = title
      ? '<a href="#/entity/' + encodeURIComponent(id) + '">' + escapeHtml(title) + '</a>'
      : '';
    const ts = event.ts
      ? new Date(event.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      : '';
    return [
      '<li>',
        '<span class="cockpit-list-dot ' + dotCls + '"></span>',
        '<span class="cockpit-list-title">' + escapeHtml(label) + ' ' + content + '</span>',
        '<span class="cockpit-list-meta">' + escapeHtml(ts) + '</span>',
      '</li>'
    ].join('');
  }

  function renderList(events) {
    const recent = events.slice(-8).reverse();
    return '<ul class="cockpit-list">' + recent.map(renderRow).join('') + '</ul>';
  }

  async function fetchEvents() {
    if (!window.__api || !window.__api.api || !window.__api.api.get) return [];
    try {
      const r = await window.__api.api.get('/api/events?days=7');
      return (r && r.events) || [];
    } catch (e) { /* ignore — empty state will render */ }
    return [];
  }

  async function renderRecentActivity() {
    const events = await fetchEvents();
    if (events.length === 0) return emptyState();
    return block('近期活动', events.length, renderList(events));
  }

  window.__cockpitActivity = {
    renderRecentActivity,
    TYPE_LABELS,
    TYPE_DOTS,
    // exposed for tests
    _internals: { renderRow, renderList, emptyState, block, activityIcon },
  };
})();
