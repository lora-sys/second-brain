// Link fetcher: lightweight metadata + deep content extraction.
// - Lightweight: title, description, image, favicon, site name.
// - Deep: full article body converted to markdown-ish text.

import { JSDOM } from 'jsdom';

const TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB cap

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function ensureUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new Error('URL is required');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

function absolutize(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function pickMeta(doc, names) {
  const lower = new Map(names.map((n) => [n.toLowerCase(), true]));
  const props = new Map(names.map((n) => [n.toLowerCase(), n]));
  const out = {};
  for (const el of doc.querySelectorAll('meta')) {
    const k =
      (el.getAttribute('property') || el.getAttribute('name') || el.getAttribute('itemprop') || '')
        .toLowerCase()
        .trim();
    if (lower.has(k)) {
      out[props.get(k)] = el.getAttribute('content') || '';
    }
  }
  return out;
}

function detectSiteName(doc, url) {
  const meta = pickMeta(doc, ['og:site_name', 'application-name']);
  if (meta['og:site_name']) return meta['og:site_name'];
  if (meta['application-name']) return meta['application-name'];
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function findMainNode(doc) {
  const candidates = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '#main',
  ];
  for (const sel of candidates) {
    const node = doc.querySelector(sel);
    if (node && node.textContent && node.textContent.trim().length > 200) return node;
  }
  return doc.body;
}

function htmlToMarkdown(root, baseUrl) {
  // Conservative HTML → markdown that preserves structure and inline media.
  const lines = [];
  const walk = (node, listDepth = 0) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe', 'aside', 'nav', 'footer', 'header'].includes(tag)) {
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      const lvl = Number(tag[1]);
      const t = node.textContent.trim();
      if (t) lines.push(`\n${'#'.repeat(lvl)} ${t}\n`);
      return;
    }
    if (tag === 'p') {
      const t = textOnly(node);
      if (t) lines.push(`\n${t}\n`);
      return;
    }
    if (tag === 'br') {
      lines.push('\n');
      return;
    }
    if (tag === 'blockquote') {
      const t = textOnly(node);
      if (t) lines.push(`\n> ${t.replace(/\n/g, '\n> ')}\n`);
      return;
    }
    if (tag === 'pre' || tag === 'code') {
      const t = node.textContent;
      if (tag === 'pre') {
        lines.push(`\n\`\`\`\n${t}\n\`\`\`\n`);
      } else {
        lines.push(`\`${t}\``);
      }
      return;
    }
    if (tag === 'img') {
      const src = node.getAttribute('src');
      if (src) {
        const url = absolutize(src, baseUrl);
        const alt = node.getAttribute('alt') || '';
        lines.push(`\n![${alt}](${url})\n`);
      }
      return;
    }
    if (tag === 'a') {
      const href = node.getAttribute('href');
      const text = textOnly(node);
      if (href && text) {
        lines.push(`[${text}](${absolutize(href, baseUrl)})`);
      } else if (text) {
        lines.push(text);
      }
      return;
    }
    if (tag === 'video') {
      const src = node.getAttribute('src') || node.querySelector('source')?.getAttribute('src');
      if (src) lines.push(`\n[video](${absolutize(src, baseUrl)})\n`);
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      let i = 1;
      for (const li of node.children) {
        if (li.tagName.toLowerCase() !== 'li') continue;
        const bullet = ordered ? `${i}.` : '-';
        const t = textOnly(li);
        const indent = '  '.repeat(listDepth);
        lines.push(`\n${indent}${bullet} ${t}`);
        i += 1;
        // Nested lists
        for (const sub of li.children) {
          if (sub.tagName.toLowerCase() === 'ul' || sub.tagName.toLowerCase() === 'ol') {
            walk(sub, listDepth + 1);
          }
        }
      }
      lines.push('\n');
      return;
    }
    if (tag === 'hr') {
      lines.push('\n---\n');
      return;
    }
    if (tag === 'figure') {
      const img = node.querySelector('img');
      const cap = node.querySelector('figcaption');
      if (img?.getAttribute('src')) {
        const url = absolutize(img.getAttribute('src'), baseUrl);
        const alt = cap?.textContent?.trim() || img.getAttribute('alt') || '';
        lines.push(`\n![${alt}](${url})\n`);
        if (cap) lines.push(`*${cap.textContent.trim()}*\n`);
      }
      return;
    }
    // Default: walk children.
    for (const child of node.childNodes) walk(child, listDepth);
  };

  const textOnly = (n) => {
    const clone = n.cloneNode(true);
    clone.querySelectorAll('script,style,noscript').forEach((x) => x.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  };

  walk(root);
  return lines
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

async function fetchHtml(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: ctl.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    // Cap body length.
    const reader = res.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        throw new Error(`Response exceeded ${MAX_BYTES} bytes`);
      }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks.map((u) => Buffer.from(u)));
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('text/html') && !ctype.includes('application/xhtml')) {
      // Non-HTML content: just return metadata.
      return { html: '', contentType: ctype, finalUrl: res.url || url };
    }
    return { html: buf.toString('utf8'), contentType: ctype, finalUrl: res.url || url };
  } finally {
    clearTimeout(t);
  }
}

export async function fetchLight(url) {
  const finalUrl = ensureUrl(url);
  const { html, finalUrl: real } = await fetchHtml(finalUrl);
  const dom = new JSDOM(html || '<html></html>', { url: real });
  const doc = dom.window.document;
  const og = pickMeta(doc, [
    'og:title',
    'og:description',
    'og:image',
    'og:site_name',
    'description',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]);
  const title =
    doc.querySelector('title')?.textContent?.trim() ||
    og['og:title'] ||
    og['twitter:title'] ||
    '';
  const description =
    og['og:description'] ||
    og['twitter:description'] ||
    og.description ||
    '';
  const cover = og['og:image'] ? absolutize(og['og:image'], real) : '';
  const siteName = detectSiteName(doc, real);
  const favicon = pickFavicon(doc, real);
  return {
    url: real,
    finalUrl: real,
    title: title.trim(),
    description: description.trim(),
    cover,
    favicon,
    siteName,
  };
}

export async function fetchDeep(url) {
  const finalUrl = ensureUrl(url);
  const { html, finalUrl: real } = await fetchHtml(finalUrl);
  const dom = new JSDOM(html || '<html></html>', { url: real });
  const doc = dom.window.document;
  const og = pickMeta(doc, [
    'og:title',
    'og:description',
    'og:image',
    'og:site_name',
    'description',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]);
  const title =
    doc.querySelector('title')?.textContent?.trim() ||
    og['og:title'] ||
    og['twitter:title'] ||
    '';
  const description =
    og['og:description'] ||
    og['twitter:description'] ||
    og.description ||
    '';
  const cover = og['og:image'] ? absolutize(og['og:image'], real) : '';
  const siteName = detectSiteName(doc, real);
  const favicon = pickFavicon(doc, real);
  const main = findMainNode(doc);
  // Strip clutter inside main
  main
    .querySelectorAll('script,style,noscript,aside,nav,footer,header,form,button')
    .forEach((n) => n.remove());
  const content = htmlToMarkdown(main, real);
  return {
    url: real,
    finalUrl: real,
    title: title.trim(),
    description: description.trim(),
    cover,
    favicon,
    siteName,
    content,
  };
}

function pickFavicon(doc, baseUrl) {
  const candidates = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ];
  for (const sel of candidates) {
    const el = doc.querySelector(sel);
    if (el?.getAttribute('href')) return absolutize(el.getAttribute('href'), baseUrl);
  }
  try {
    const u = new URL(baseUrl);
    return `${u.origin}/favicon.ico`;
  } catch {
    return '';
  }
}
