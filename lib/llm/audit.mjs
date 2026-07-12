// AI tool-call audit log. Every AI action is recorded to the vault
// under 00-AI/audit/<date>/<timestamp>.md so the user can see what the AI did.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {Object} opts
 * @param {string} opts.vaultPath - root of the Obsidian vault
 * @param {string} opts.provider - provider name (e.g. "openai")
 * @param {string} opts.tool - tool name (e.g. "sb_search")
 * @param {Object} opts.input - tool input
 * @param {Object} opts.output - tool output
 * @param {number} opts.durationMs
 * @param {string} [opts.auditPath='00-AI/audit']
 */
export async function logToolCall({ vaultPath, provider, tool, input, output, durationMs, auditPath = '00-AI/audit' }) {
  const ts = new Date();
  const dateStr = ts.toISOString().slice(0, 10);
  const timeStr = ts.toISOString().slice(11, 19);
  const dir = path.join(vaultPath, auditPath, dateStr);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${timeStr}-${provider}-${tool}.md`);
  const body = `---
ts: ${ts.toISOString()}
provider: ${provider}
tool: ${tool}
durationMs: ${durationMs}
---

## Input

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

## Output

\`\`\`json
${JSON.stringify(output, null, 2)}
\`\`\`
`;
  await writeFile(file, body, 'utf8');
  return file;
}
