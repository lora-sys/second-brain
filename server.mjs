// Second Brain Dashboard entry point.
// Serves a vanilla JS frontend + JSON API on a local-only port.
// All data is stored as Markdown files inside the user's Obsidian vault.

import { start, server } from './lib/server.mjs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');

async function ensureConfig() {
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    const defaults = {
      vaultPath: '/home/lora/文档/Obsidian Vault',
      port: 3939,
      host: '127.0.0.1',
      directories: {
        person: '10-People',
        task: '20-Tasks',
        project: '30-Projects',
        link: '40-Links',
        dashboard: '00-Dashboard',
      },
    };
    await fs.writeFile(CONFIG_PATH, JSON.stringify(defaults, null, 2) + '\n', 'utf8');
    console.log('[second-brain] created default config.json — please review vaultPath.');
  }
}

async function main() {
  await ensureConfig();
  await start();

  const shutdown = (sig) => {
    console.log(`\n[second-brain] received ${sig}, shutting down.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[second-brain] fatal:', err);
  process.exit(1);
});
