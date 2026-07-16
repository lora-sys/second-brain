// v0.17 — Markdown output sanitizer.
// Wraps marked.parse() output and returns a safe, allowlist-filtered HTML string.
//
// Why: marked.parse() outputs raw HTML. Vault files are user-controlled, and
// future MCP-vendored or LLM-generated content will be too. Defense-in-depth:
// even if a malicious <script> or javascript: link slips into a note, it must
// not execute.
//
// No new deps — uses native DOMParser. The allowlist is mirrored in
// lib/sanitize.mjs for server-side use (jsdom — already a dep).

(function () {
  const ALLOWED_TAGS = new Set([
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 's', 'del', 'ins', 'u', 'mark', 'small',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'q', 'cite',
    'code', 'pre', 'kbd', 'samp', 'var',
    'a', 'img', 'iframe',           // iframe only with src on EMBED_HOSTS
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'span', 'div', 'figure', 'figcaption',
    'sub', 'sup',
  ]);

  const ALLOWED_ATTRS = {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['align'], td: ['align'],
    iframe: ['src', 'allow', 'allowfullscreen', 'width', 'height', 'frameborder', 'title'],
    '*': ['class'],
  };

  const URL_ATTRS = new Set(['href', 'src']);
  const DANGEROUS_URL = /^\s*(javascript|vbscript|data)\s*:/i;

  // Iframes are only allowed to load from these embed hosts.
  const EMBED_HOSTS = [
    'www.youtube.com',
    'youtube.com',
    'youtu.be',
    'player.vimeo.com',
    'player.bilibili.com',
  ];

  function isEmbedHost(host) {
    if (!host) return false;
    return EMBED_HOSTS.includes(host);
  }

  function isSafeUrl(value) {
    if (!value) return true;
    if (DANGEROUS_URL.test(value)) return false;
    return true;
  }

  function allowedAttrsFor(tag) {
    const a = ALLOWED_ATTRS[tag] || [];
    const star = ALLOWED_ATTRS['*'] || [];
    const set = new Set([...a, ...star]);
    for (const k of Array.from(set)) {
      if (/^on/i.test(k)) set.delete(k);
    }
    return set;
  }

  function sanitizeAttrs(node) {
    const tag = node.tagName.toLowerCase();
    const allow = allowedAttrsFor(tag);
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (!allow.has(name)) {
        node.removeAttribute(attr.name);
        continue;
      }
      const value = attr.value;
      if (URL_ATTRS.has(name)) {
        // iframe: even on safe hosts, if src is non-allowlisted or unsafe, drop the whole element
        if (tag === 'iframe') {
          if (!isSafeUrl(value)) {
            if (node.parentNode) node.parentNode.removeChild(node);
            return;
          }
          let host = '';
          try { host = new URL(value, 'https://_').hostname; } catch { host = ''; }
          if (!isEmbedHost(host)) {
            if (node.parentNode) node.parentNode.removeChild(node);
            return;
          }
          // allowed iframe — keep src, fall through to other attr checks below
        } else if (!isSafeUrl(value)) {
          node.removeAttribute(attr.name);
          continue;
        }
      }
      if (name === 'target' && !/^[._a-zA-Z0-9-]{1,32}$/.test(value)) {
        node.removeAttribute(attr.name);
      }
      if (name === 'class' && !/^[\w\-./ ]*$/.test(value)) {
        node.removeAttribute(attr.name);
      }
    }
  }

  function unwrap(node) {
    const parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  function walk(root) {
    const queue = Array.from(root.querySelectorAll('*'));
    for (const node of queue) {
      if (!node.parentNode) continue;
      const tag = node.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        unwrap(node);
        continue;
      }
      sanitizeAttrs(node);
    }
  }

  function sanitizeHtml(html) {
    if (!html) return '';
    let src = String(html);
    src = src.replace(/^\s*<!doctype[^>]*>/i, '');
    let doc;
    try {
      doc = new DOMParser().parseFromString(src, 'text/html');
    } catch (e) {
      return '';
    }
    const body = doc.body;
    if (!body) return '';
    walk(body);
    return body.innerHTML;
  }

  window.sbSanitize = {
    html: sanitizeHtml,
    _allowed: ALLOWED_TAGS,
    _embedHosts: EMBED_HOSTS,
  };
})();
