// v0.16 — Unit tests for the Recent Activity cockpit component.
//
// The component is browser-only (uses `window`). We shim the minimal
// `window` surface via jsdom so the test can run under plain `node`.

import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(here, '..', 'public', 'lib', 'cockpit-activity.js'), 'utf8');

let passed = 0, failed = 0;
function eq(name, got, want) {
  if (got === want) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name);
  console.log('        got:  ' + JSON.stringify(got));
  console.log('        want: ' + JSON.stringify(want));
}
function contains(name, got, needle) {
  if (typeof got === 'string' && got.includes(needle)) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name);
  console.log('        got:  ' + JSON.stringify(got));
  console.log('        need: ' + JSON.stringify(needle));
}
function notContains(name, got, needle) {
  if (typeof got === 'string' && !got.includes(needle)) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name);
  console.log('        got:  ' + JSON.stringify(got));
  console.log('        must NOT contain: ' + JSON.stringify(needle));
}

async function loadComponent({ events = null, apiError = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1/', runScripts: 'outside-only' });
  const win = dom.window;
  // ICONS stub — empty (matches cockpit.js's missing 'activity' entry).
  win.__ICONS = { ICONS: {} };
  // API stub — returns canned events or throws.
  win.__api = {
    api: {
      get: apiError
        ? async () => { throw new Error('network down'); }
        : async (url) => {
            if (url === '/api/events?days=7') return { events: events || [] };
            throw new Error('unknown url ' + url);
          },
    },
  };
  // Inject `window` into the script if not already (the source uses bare `window`).
  const wrapped = SRC.includes('const ICONS = (window.')
    ? SRC
    : 'const window = this;\n' + SRC;
  // Compile & run as a top-level script in this window via vm.
  const vm = await import('vm');
  vm.runInContext(wrapped, dom.getInternalVMContext());
  // jsdom also exposes things directly on `win`; copy to the test side.
  const exposed = win.__cockpitActivity;
  if (!exposed) {
    // Also try globalThis on the window
    if (dom.window.__cockpitActivity) return dom.window.__cockpitActivity;
    throw new Error('component did not attach window.__cockpitActivity');
  }
  return exposed;
}

// ===== Empty state =====
{
  const c = await loadComponent({ events: [] });
  const html = await c.renderRecentActivity();
  contains('empty state has article', html, 'cockpit-today-block block-activity');
  contains('empty state title', html, '<h2 class="cockpit-block-title">近期活动</h2>');
  contains('empty state count is 0', html, '<span class="cockpit-block-count">0</span>');
  contains('empty state msg', html, '过去 7 天没有事件流');
  notContains('empty state has no items list', html, '<ul');
}

// ===== Network failure falls through to empty state =====
{
  const c = await loadComponent({ apiError: true });
  const html = await c.renderRecentActivity();
  contains('error → empty state has empty msg', html, '过去 7 天没有事件流');
}

// ===== Single event renders with correct label + dot =====
{
  const now = Date.now();
  const c = await loadComponent({ events: [
    { type: 'task.created', id: 'task-1', title: 'Buy milk', ts: now },
  ]});
  const html = await c.renderRecentActivity();
  contains('task.created label', html, '任务 开了');
  contains('task.created dot', html, 'dot-task');
  contains('entity link', html, 'href="#/entity/task-1"');
  contains('escaped entity title', html, 'Buy milk');
  contains('count = total (not 8)', html.replace(/<svg[^<]*<\/svg>/g, ''), '<span class="cockpit-block-count">1</span>');
}

// ===== Recent slice: take latest 8, in reverse order =====
{
  const c = await loadComponent({ events: Array.from({ length: 12 }, (_, i) => ({
    type: 'task.created', id: 'task-' + i, title: 'T' + i, ts: Date.now() + i * 1000,
  }))});
  const html = await c.renderRecentActivity();
  contains('count = 12 (total events)', html, '<span class="cockpit-block-count">12</span>');
  // 12 events but only 8 rows; first row is the latest (T11), last row is T4.
  contains('latest event T11 shown first', html, 'T11');
  contains('T4 shown (last of 8)', html, 'T4');
  notContains('T3 cut off (>8)', html, '>T3<');
}

// ===== Multiple distinct types render with their own labels / dots =====
{
  const c = await loadComponent({ events: [
    { type: 'task.done',         id: 'a', title: 'done task' },
    { type: 'file.changed',      id: 'b', title: 'note.md' },
    { type: 'daily.generated',   id: 'c', title: 'today' },
    { type: 'decision.created',  id: 'd', title: 'fork in the road' },
    { type: 'person.created',    id: 'e', title: 'alex' },
    { type: 'link.imported',     id: 'f', title: 'todo' },
  ]});
  const html = await c.renderRecentActivity();
  contains('task.done label',    html, '任务 完成');
  contains('file.changed label', html, '文件 修改');
  contains('daily.generated',   html, '日记 生成');
  contains('decision.label',     html, '决策 记录');
  contains('person.label',       html, '人物 添加');
  contains('link.label',         html, '链接 导入');
  contains('dot-decision',       html, 'dot-decision');
  contains('dot-person',         html, 'dot-person');
  contains('dot-link',           html, 'dot-link');
}

// ===== Unknown event type falls back to raw type string =====
{
  const c = await loadComponent({ events: [
    { type: 'totally.new.event', id: 'x', title: 'unknown' },
  ]});
  const html = await c.renderRecentActivity();
  contains('unknown → raw type used as label', html, 'totally.new.event');
  contains('unknown → default dot-task', html, 'dot-task');
}

// ===== Escape: title with HTML chars =====
{
  const c = await loadComponent({ events: [
    { type: 'task.created', id: 'esc-1', title: '<script>alert(1)</script>' },
  ]});
  const html = await c.renderRecentActivity();
  notContains('escape: script tag', html, '<script>alert(1)</script>');
  contains('escape: ampersand-form', html, '&lt;script&gt;');
}

// ===== Constants =====
{
  const c = await loadComponent();
  // Every entry in TYPE_LABELS must also be in TYPE_DOTS and vice versa.
  for (const t of Object.keys(c.TYPE_LABELS)) {
    if (!Object.prototype.hasOwnProperty.call(c.TYPE_DOTS, t)) {
      failed++;
      console.log('  FAIL  parity: TYPE_LABELS has ' + t + ' missing in TYPE_DOTS');
    } else {
      passed++;
    }
  }
  // Required types (the documented event taxonomy)
  for (const t of ['task.created', 'task.done', 'task.updated', 'task.deleted',
                   'project.created', 'person.created', 'link.imported',
                   'file.changed', 'daily.generated', 'weekly.generated',
                   'decision.created', 'decision.updated']) {
    if (!c.TYPE_LABELS[t]) { failed++; console.log('  FAIL  missing label for ' + t); }
    else if (!c.TYPE_DOTS[t]) { failed++; console.log('  FAIL  missing dot for ' + t); }
    else { passed++; console.log('  PASS  type ' + t); }
  }
}

// ===== Surface check =====
{
  const c = await loadComponent();
  if (typeof c.renderRecentActivity !== 'function') { failed++; console.log('  FAIL  renderRecentActivity exposed'); }
  else { passed++; console.log('  PASS  renderRecentActivity exposed'); }
  if (typeof c.TYPE_LABELS !== 'object' || !c.TYPE_LABELS) { failed++; console.log('  FAIL  TYPE_LABELS exposed'); }
  else { passed++; console.log('  PASS  TYPE_LABELS exposed'); }
  if (typeof c.TYPE_DOTS !== 'object' || !c.TYPE_DOTS) { failed++; console.log('  FAIL  TYPE_DOTS exposed'); }
  else { passed++; console.log('  PASS  TYPE_DOTS exposed'); }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
