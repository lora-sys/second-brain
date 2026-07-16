// v0.20 — Unit tests for MCP resources + prompts.
//
// Tests:
//   - listResources returns 5 well-known resources
//   - readResource for each URI returns non-empty JSON
//   - listPrompts returns 4 well-known prompts
//   - getPrompt for each name returns a { description, messages } shape
//   - bad inputs throw (resource URI unknown; prompt missing required args)

import { listResources, readResource } from '../lib/mcp-resources.mjs';
import { listPrompts, getPrompt } from '../lib/mcp-prompts.mjs';

let passed = 0, failed = 0;
function eq(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name);
  console.log('        got:  ' + JSON.stringify(got));
  console.log('        want: ' + JSON.stringify(want));
}
function truthy(name, got) {
  if (got) { passed++; console.log('  PASS  ' + name); return; }
  failed++;
  console.log('  FAIL  ' + name + ' (got: ' + JSON.stringify(got) + ')');
}
function throws(name, fn) {
  try { fn(); failed++; console.log('  FAIL  ' + name + ' (did not throw)'); }
  catch (e) { passed++; console.log('  PASS  ' + name); }
}

// ===== Resources =====
{
  const r = listResources();
  eq('listResources returns 5 resources', r.length, 5);
  const uris = r.map((x) => x.uri).sort();
  eq('listResources URI list', uris, [
    'vault://entities', 'vault://graph', 'vault://recent',
    'vault://skills', 'vault://tags',
  ]);
  for (const x of r) {
    truthy('listResources entry has uri', !!x.uri);
    truthy('listResources entry has name', !!x.name);
    truthy('listResources entry has description', !!x.description);
    truthy('listResources entry has mimeType=application/json', x.mimeType === 'application/json');
  }
}

// readResource with a stub vault
{
  const stubVault = {
    listAll: async () => ([
      {
        id: '10-People/alice', type: 'person', slug: 'alice',
        data: { title: 'Alice', tags: ['friend'] },
        body: 'Hi there',
      },
      {
        id: '20-Tasks/buy-milk', type: 'task', slug: 'buy-milk',
        data: { title: 'Buy milk', updated: new Date().toISOString() },
        body: '',
      },
      {
        id: '30-Projects/x', type: 'project', slug: 'x',
        data: { title: 'X', tags: ['urgent', 'frontend'], updated: '2020-01-01' },
        body: '',
      },
    ]),
    root: '/tmp/sb-test',
  };
  {
    const txt = await readResource('vault://entities', stubVault);
    const parsed = JSON.parse(txt);
    eq('vault://entities count', parsed.count, 3);
    eq('vault://entities items length', parsed.items.length, 3);
    eq('vault://entities[0] id', parsed.items[0].id, '10-People/alice');
  }
  {
    const txt = await readResource('vault://recent', stubVault);
    const parsed = JSON.parse(txt);
    // Only the recent one (within 7 days); the project is 2020-01-01.
    truthy('vault://recent filters by last 7 days', parsed.count >= 1 && parsed.count <= 2);
  }
  {
    const txt = await readResource('vault://tags', stubVault);
    const parsed = JSON.parse(txt);
    eq('vault://tags total', parsed.total, 3); // friend, urgent, frontend
    eq('vault://tags friend count', parsed.tags.friend, 1);
    eq('vault://tags urgent count', parsed.tags.urgent, 1);
  }
  {
    const txt = await readResource('vault://graph', stubVault);
    const parsed = JSON.parse(txt);
    truthy('vault://graph has nodes', Array.isArray(parsed.nodes) && parsed.nodes.length > 0);
    truthy('vault://graph has edges/hubs', Array.isArray(parsed.edges) && Array.isArray(parsed.hubs));
  }
}

// readResource unknown URI
{
  const stubVault = { listAll: async () => [], root: '/tmp' };
  try {
    await readResource('vault://bogus', stubVault);
    failed++; console.log('  FAIL  unknown URI did not throw');
  } catch (e) {
    truthy('unknown URI throws', /unknown/.test(e.message));
  }
}

// ===== Prompts =====
{
  const p = listPrompts();
  eq('listPrompts returns 4 prompts', p.length, 4);
  const names = p.map((x) => x.name).sort();
  eq('listPrompts name list', names, [
    'consolidate-tasks', 'draft-decision', 'reflect-on-day', 'summarize-week',
  ]);
}

{
  // summarize-week: optional date
  const r = getPrompt('summarize-week', {});
  truthy('summarize-week → description', r.description.length > 0);
  eq('summarize-week → messages length', r.messages.length, 1);
  eq('summarize-week → role', r.messages[0].role, 'user');
  truthy('summarize-week → text content', r.messages[0].content.text.length > 0);
}
{
  const r = getPrompt('summarize-week', { date: '2026-07-15' });
  truthy('summarize-week with explicit date mentions the date', r.messages[0].content.text.includes('2026-07-15'));
}

{
  // draft-decision: requires context
  try { getPrompt('draft-decision', {}); failed++; console.log('  FAIL  draft-decision without context did not throw'); }
  catch (e) { passed++; console.log('  PASS  draft-decision without context throws'); }
  const r = getPrompt('draft-decision', { context: 'Choosing between tool A and tool B' });
  truthy('draft-decision → context in message', r.messages[0].content.text.includes('Choosing between tool A and tool B'));
}

{
  // consolidate-tasks: no args
  const r = getPrompt('consolidate-tasks', {});
  truthy('consolidate-tasks → mentions list_entities', r.messages[0].content.text.includes('list_entities'));
}

{
  // reflect-on-day: optional date
  const r = getPrompt('reflect-on-day', {});
  truthy('reflect-on-day default', r.messages[0].content.text.length > 0);
  const r2 = getPrompt('reflect-on-day', { date: '2026-07-15' });
  truthy('reflect-on-day with date mentions it', r2.messages[0].content.text.includes('2026-07-15'));
}

{
  // unknown prompt
  try {
    getPrompt('bogus-prompt', {});
    failed++; console.log('  FAIL  unknown prompt did not throw');
  } catch (e) {
    truthy('unknown prompt throws', /unknown/.test(e.message));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
