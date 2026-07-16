// v0.17 — Server-side markdown output sanitizer.
//
// Mirrors public/lib/sanitize.js but runs in Node (Tauri or HTTP) using jsdom.
// The allowlist is identical to the browser version — keep them in sync.

import { JSDOM } from 'jsdom';

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 's', 'del', 'ins', 'u', 'mark', 'small',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'q', 'cite',
  'code', 'pre', 'kbd', 'samp', 'var',
  'a', 'img', 'iframe',
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
      // iframe: drop the whole element if src is unsafe or non-allowlisted
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

export function sanitizeHtml(html) {
  if (!html) return '';
  let src = String(html);
  src = src.replace(/^\s*<!doctype[^>]*>/i, '');
  let dom;
  try {
    dom = new JSDOM(src);
  } catch (e) {
    return '';
  }
  const body = dom.window.document.body;
  if (!body) return '';
  walk(body);
  return body.innerHTML;
}

export function sanitizeText(html) {
  if (!html) return '';
  let dom;
  try {
    dom = new JSDOM(`<div>${String(html)}</div>`);
  } catch (e) {
    return '';
  }
  return dom.window.document.body.textContent || '';
}
