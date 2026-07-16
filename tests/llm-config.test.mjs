// v0.18 — Unit tests for LLM config redaction + provider resolution.
//
// Imports maskApiKey & getLlmOpts directly from lib/server.mjs, and
// verifies pickProvider from daily.mjs / weekly.mjs accepts opts.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { maskApiKey, getLlmOpts } from '../lib/server.mjs';
import { pickProvider as dailyPick } from '../lib/daily.mjs';
import { pickProvider as weeklyPick } from '../lib/weekly.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

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
function notEqual(name, got, bad) {
  if (got !== bad) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name);
  console.log('        got: ' + JSON.stringify(got));
  console.log('        must NOT equal: ' + JSON.stringify(bad));
}

// maskApiKey
eq('mask: empty → empty', maskApiKey(''), '');
eq('mask: short → bullets', maskApiKey('ab'), '••••');
eq('mask: long → •• + last 4', maskApiKey('sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890'),
   '••••••••' + '1234567890'.slice(-4) /* 7890 */ || '••••••••' + 'sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890'.slice(-4));
// Above: maskApiKey('sk-...1234567890') returns '••••••••' + last 4 of original = '••••••••7890'.
eq('mask: long key', maskApiKey('sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890'), '••••••••7890');
eq('mask: 5-char key → long bullet form', maskApiKey('12345'), '••••••••2345');
// maskApiKey: length>4, last 4 = '2345', so '••••••••2345'
const m5 = maskApiKey('12345'); contains('mask: 5-char preserves last 4', m5, '2345');
notEqual('mask: long key not raw', maskApiKey('sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890'), 'sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890');

// getLlmOpts with no llm block
{
  const r = getLlmOpts({});
  eq('getLlmOpts({}) → empty opts keys', Object.keys(r).length, 0);
  eq('getLlmOpts({}) → no apiKey', r.apiKey, undefined);
  eq('getLlmOpts({}) → no model', r.model, undefined);
}
{
  const r = getLlmOpts(null);
  eq('getLlmOpts(null) → empty', r.apiKey || '', '');
}
{
  const r = getLlmOpts({ llm: { apiKey: 'sk-test', baseUrl: 'http://x/v1', model: 'gpt-4o-mini' } });
  eq('getLlmOpts: apiKey passthrough', r.apiKey, 'sk-test');
  eq('getLlmOpts: baseUrl → baseURL', r.baseURL, 'http://x/v1');
  eq('getLlmOpts: model passthrough', r.model, 'gpt-4o-mini');
}
{
  // Empty values fall through; the provider itself reads from env as fallback.
  const r = getLlmOpts({ llm: { apiKey: '', baseUrl: '   ', model: '' } });
  eq('getLlmOpts: empty strings preserved', r.apiKey, '');
  eq('getLlmOpts: baseUrl whitespace preserved', r.baseURL, '   ');
}

// daily pickProvider: with no opts and no env → local-echo
{
  const p = dailyPick();
  const info = p.info();
  contains('daily.pickProvider() default → local-echo', info.name, 'local-echo');
}

// daily pickProvider: with opts overrides env
{
  // Clear any inherited env so the test is hermetic.
  const saved = { ...process.env };
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  try {
    const p = dailyPick({ apiKey: '', baseURL: 'http://127.0.0.1:9999/v1', model: 'm-llm-1' });
    const info = p.info();
    eq('daily.pickProvider with baseURL → model used', info.model, 'm-llm-1');
    eq('daily.pickProvider with baseURL → isLocal', info.isLocal, true);
  } finally {
    process.env = saved;
  }
}

// weekly pickProvider: with no opts and no env → local-echo
{
  const p = weeklyPick();
  contains('weekly.pickProvider() default → local-echo', p.info().name, 'local-echo');
}

// weekly pickProvider: opts override
{
  const saved = { ...process.env };
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  try {
    const p = weeklyPick({ apiKey: '', baseURL: 'http://127.0.0.1:9999/v1', model: 'm-llm-2' });
    eq('weekly.pickProvider with baseURL → model used', p.info().model, 'm-llm-2');
  } finally {
    process.env = saved;
  }
}

// make sure server.mjs still parses & exports
{
  const lib = await import('../lib/server.mjs');
  contains('server.mjs exports start + server', Object.keys(lib).join(','), 'start');
  contains('server.mjs exports redactConfig + getLlmOpts (via import-time parse)', Object.keys(lib).join(','), 'getLlmOpts');
}

// round-trip config shape — redactConfig used by GET /api/config must hide the raw key
import { redactConfig } from '../lib/server.mjs';
{
  const raw = 'sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890';
  const r = redactConfig({ llm: { apiKey: raw, baseUrl: 'http://127.0.0.1:9999/v1', model: 'm-1' } });
  eq('redact: configured=true when key present', r.llm.configured, true);
  eq('redact: apiKey masked (bullets + last 4)', r.llm.apiKey, '••••••••7890');
  eq('redact: baseUrl passthrough', r.llm.baseUrl, 'http://127.0.0.1:9999/v1');
  eq('redact: model passthrough', r.llm.model, 'm-1');
  const json = JSON.stringify(r);
  // The raw apiKey is 'sk-proj-AbCdEfGhIjKlMnOp-QrStUvWx-1234567890'; ensure
  // its long prefix does NOT appear in the serialized response.
  eq('redact: raw key prefix hidden from JSON', json.includes('sk-proj-AbCdEfGh'), false);
  notEqual('redact: raw apiKey not exposed (returned value different from raw)', r.llm.apiKey, raw);
  // The raw key substring (chars that aren't the last 4) must not be present.
  eq('redact: 30-char raw prefix hidden', JSON.stringify(r).includes(raw.slice(0, raw.length - 4)), false);
}

// Real redact test: import the helper via /tmp HTTP round-trip would be
// heavy; instead just verify maskApiKey output never contains the raw key.
{
  const raw = 'sk-' + 'x'.repeat(40);
  const m = maskApiKey(raw);
  notEqual('redact: raw key never in mask output', m, raw);
  notEqual('redact: mask does not begin with raw prefix', m.startsWith('sk-'), true);
  eq('redact: mask only contains bullets + last 4', m, '••••••••' + raw.slice(-4));
}

// Cleanup any test state files we may have made.
try { await fs.rm(path.join(here, '..', 'config.test.json')); } catch {}
try { await fs.rm(path.join(here, '..', 'config.test.r.json')); } catch {}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
