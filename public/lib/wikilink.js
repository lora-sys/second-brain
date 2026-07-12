// v0.3 — Wikilink autocomplete
// Listens globally for `[[` triggers in textareas, shows a floating popup.
// Reads entity index from window.__appState.allEntities (pre-loaded by main app).

(() => {
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = {
    active: false,
    field: null,
    triggerPos: -1,
    query: '',
    matches: [],
    selectedIdx: 0,
    popup: null,
  };

  function ensurePopup() {
    if (state.popup) return state.popup;
    const el = document.createElement('div');
    el.className = 'wikilink-popup hidden';
    document.body.appendChild(el);
    state.popup = el;
    el.addEventListener('mousedown', (e) => {
      const opt = e.target.closest('.wikilink-option');
      if (!opt) return;
      e.preventDefault();
      state.selectedIdx = parseInt(opt.dataset.idx, 10);
      selectCurrent();
    });
    return el;
  }

  function hide() {
    if (state.popup) state.popup.classList.add('hidden');
    state.active = false;
    state.field = null;
    state.triggerPos = -1;
    state.query = '';
    state.matches = [];
    state.selectedIdx = 0;
  }

  function getEntities() {
    const all = window.__appState?.allEntities || [];
    return all;
  }

  function typeBadge(type) {
    const map = { person: '人', task: '务', project: '项', link: '链' };
    return `<span class="wikilink-option-badge ${type}">${map[type] || '?'}</span>`;
  }

  function renderMatches() {
    if (!state.matches.length) {
      return '<div class="wikilink-empty">没有匹配的实体</div>';
    }
    return state.matches.map((m, i) => `
      <div class="wikilink-option ${i === state.selectedIdx ? 'is-active' : ''}" data-idx="${i}">
        ${typeBadge(m.type)}
        <span class="wikilink-option-title">${escapeHtml(m.label)}</span>
        <span class="wikilink-option-meta">${m.type}/${escapeHtml(m.slug)}</span>
      </div>
    `).join('');
  }

  function getCaretCoordinates(field, position) {
    const mirror = document.createElement('div');
    const cs = getComputedStyle(field);
    for (const prop of ['width', 'height', 'padding', 'borderWidth', 'borderStyle', 'borderColor', 'boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform', 'textIndent']) {
      mirror.style[prop] = cs[prop];
    }
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.textContent = field.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = field.value.substring(position) || '.';
    mirror.appendChild(span);
    document.body.appendChild(mirror);
    const coords = { top: span.offsetTop - field.scrollTop, left: span.offsetLeft - field.scrollLeft };
    document.body.removeChild(mirror);
    return coords;
  }

  function positionPopup(field, pos) {
    const popup = ensurePopup();
    const coords = getCaretCoordinates(field, pos);
    const fieldRect = field.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    let top = fieldRect.top + window.scrollY + coords.top + 22;
    let left = fieldRect.left + window.scrollX + coords.left;
    if (top + popupRect.height > window.innerHeight + window.scrollY) {
      top = fieldRect.top + window.scrollY + coords.top - popupRect.height - 8;
    }
    if (left + popupRect.width > window.innerWidth) {
      left = window.innerWidth - popupRect.width - 12;
    }
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  function update() {
    if (!state.active) return;
    const all = getEntities();
    const q = state.query.toLowerCase().trim();
    let matches;
    if (!q) {
      matches = all.slice(0, 8);
    } else {
      matches = all.filter((m) =>
        m.label.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.type.includes(q)
      ).slice(0, 8);
    }
    state.matches = matches;
    state.selectedIdx = 0;
    const popup = ensurePopup();
    popup.innerHTML = renderMatches();
    if (matches.length) {
      popup.classList.remove('hidden');
      positionPopup(state.field, state.field.selectionStart);
    } else {
      popup.classList.add('hidden');
    }
  }

  function findTrigger(text, pos) {
    let depth = 0;
    for (let i = pos - 1; i >= 1; i--) {
      if (text[i] === ']' && text[i - 1] === ']') { depth += 1; i--; continue; }
      if (text[i] === '[' && text[i - 1] === '[') {
        if (depth === 0) return i - 1;
        depth -= 1;
        i--;
      }
    }
    return -1;
  }

  function onInput(e) {
    const field = e.target;
    if (!(field instanceof HTMLTextAreaElement)) return;
    const pos = field.selectionStart;
    const text = field.value;
    const triggerStart = findTrigger(text, pos);
    if (triggerStart < 0) {
      if (state.active && state.field === field) hide();
      return;
    }
    const query = text.slice(triggerStart + 2, pos);
    if (query.includes('\n') || query.length > 50) { hide(); return; }
    state.active = true;
    state.field = field;
    state.triggerPos = triggerStart;
    state.query = query;
    update();
  }

  function onKeyDown(e) {
    if (!state.active) return;
    if (e.key === 'ArrowDown') {
      if (state.matches.length) {
        e.preventDefault();
        state.selectedIdx = Math.min(state.matches.length - 1, state.selectedIdx + 1);
        state.popup.innerHTML = renderMatches();
      }
    } else if (e.key === 'ArrowUp') {
      if (state.matches.length) {
        e.preventDefault();
        state.selectedIdx = Math.max(0, state.selectedIdx - 1);
        state.popup.innerHTML = renderMatches();
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (state.matches.length) {
        e.preventDefault();
        selectCurrent();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    }
  }

  function selectCurrent() {
    const m = state.matches[state.selectedIdx];
    if (!m || !state.field) return;
    const field = state.field;
    const text = field.value;
    const cursor = field.selectionStart;
    const before = text.slice(0, state.triggerPos);
    const after = text.slice(cursor);
    const dir = (window.__appState?.config?.directories?.[m.type]) || ({
      person: '10-People', task: '20-Tasks', project: '30-Projects', link: '40-Links'
    })[m.type] || m.type;
    const insertion = `${dir}/${m.slug}|${m.label}`;
    const newText = before + '[[' + insertion + ']]' + after;
    field.value = newText;
    const newPos = before.length + 2 + insertion.length + 2;
    field.setSelectionRange(newPos, newPos);
    field.focus();
    hide();
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function onMouseDown(e) {
    if (state.popup && !state.popup.contains(e.target) && e.target !== state.field) hide();
  }

  function init() {
    ensurePopup();
    document.addEventListener('input', onInput, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
  }

  // Expose API to main app
  window.__wikilinkAutocomplete = { init, hide };
})();
