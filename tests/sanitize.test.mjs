// v0.17 — Unit tests for HTML sanitizers.
// Run with: node tests/sanitize.test.mjs

import { sanitizeHtml, sanitizeText } from '../lib/sanitize.mjs';

let passed = 0;
let failed = 0;
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

// ===== Script injection =====
{
  const malicious = '<p>safe</p><script>alert(1)</script>';
  notContains('strip <script>', sanitizeHtml(malicious), '<script');
  notContains('strip </script>', sanitizeHtml(malicious), '</script');
  contains('keeps <p>safe</p>', sanitizeHtml(malicious), '<p>safe</p>');
}

{
  const malicious = '<img src=x onerror="alert(1)">';
  const r = sanitizeHtml(malicious);
  notContains('strip onerror', r, 'onerror');
  notContains('strip on*=attribute', r, 'alert(1)');
}

// ===== javascript: URLs =====
{
  const r = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
  notContains('drop javascript: href', r, 'javascript');
  contains('keeps <a> tag', r, '<a');
}
{
  const r = sanitizeHtml('<iframe src="javascript:alert(1)"></iframe>');
  notContains('drop javascript: iframe src', r, 'javascript');
  notContains('iframe fully removed', r, '<iframe');
}
{
  const r = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>');
  notContains('drop data: URL', r, 'data:text');
}
{
  const r = sanitizeHtml('<a href="https://example.com">ok</a>');
  contains('keep https: URL', r, 'href="https://example.com"');
}

// ===== Unknown tags unwrapped (kept as text) =====
{
  const r = sanitizeHtml('<unknown>x</unknown><p>y</p>');
  notContains('unknown tag removed', r, '<unknown');
  contains('keeps <p>y</p>', r, '<p>y</p>');
}
{
  // iframe with non-embed host → removed entirely (parent unwrap)
  const r = sanitizeHtml('<iframe src="https://evil.example/x"></iframe>');
  notContains('non-embed iframe removed', r, '<iframe');
}
{
  // iframe with embed host → kept
  const r = sanitizeHtml('<iframe src="https://www.youtube.com/embed/abc123"></iframe>');
  contains('youtube iframe kept', r, 'youtube.com/embed/abc123');
  contains('youtube iframe tag kept', r, '<iframe');
}
{
  const r = sanitizeHtml('<iframe src="https://player.vimeo.com/video/12345"></iframe>');
  contains('vimeo iframe kept', r, 'player.vimeo.com/video/12345');
}
{
  const r = sanitizeHtml('<iframe src="https://player.bilibili.com/player.html?bvid=BV1"></iframe>');
  contains('bilibili iframe kept', r, 'player.bilibili.com');
}

// ===== style attribute dropped =====
{
  const r = sanitizeHtml('<p style="background:url(javascript:alert(1))">hi</p>');
  notContains('drop style attribute', r, 'style=');
}

// ===== Markdown rendering parity (typical output should pass through) =====
{
  const md = '<h2>Heading</h2><p>Hello <strong>world</strong>!</p><ul><li>One</li></ul><pre><code>x = 1</code></pre>';
  eq('h2/p/strong/ul/li/pre/code preserved', sanitizeHtml(md), md);
}
{
  const md = '<blockquote><p>Quote</p></blockquote><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
  eq('blockquote/table preserved', sanitizeHtml(md), md);
}

// ===== Empty / null inputs =====
eq('null → empty', sanitizeHtml(null), '');
eq('undefined → empty', sanitizeHtml(undefined), '');
eq('empty string', sanitizeHtml(''), '');

// ===== sanitizeText =====
eq('text strips tags', sanitizeText('<p>hello <b>world</b></p>'), 'hello world');
eq('text escapes entities', sanitizeText('<p>&amp;</p>'), '&');
{
  // script is text content too
  const r = sanitizeText('<script>alert(1)</script>safe');
  contains('text includes plain "alert" if no markup would lose it', r, 'safe');
}

// ===== Doctype strip =====
{
  const r = sanitizeHtml('<!doctype html><p>safe</p>');
  notContains('doctype stripped', r, 'doctype');
  contains('body content kept', r, '<p>safe</p>');
}

// ===== on* handlers dropped =====
{
  const r = sanitizeHtml('<a href="https://x.com" onclick="alert(1)">click</a>');
  notContains('onclick stripped', r, 'onclick');
  contains('href kept', r, 'href="https://x.com"');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
