// @second-brain/core — shared library
// ESM, no build step. Node 20+.

export { Vault, withFileLock, withLockedMutation } from './vault.mjs';
export { parse, stringify, slugify, parseYamlLenient } from './frontmatter.mjs';
export { fetchLight, fetchDeep } from './linkfetch.mjs';
export { start as startServer, server as httpServer } from './server.mjs';

// LLM adapter (ADR-0002)
export {
  LocalEchoProvider,
  CachedProvider,
  RetryProvider,
  createOpenAIProvider,
  logToolCall,
} from './llm/index.js';
