// OpenAI-compatible provider. Filled in at v0.5.
// For now, this is a stub that documents the contract.

/**
 * Create an OpenAI provider.
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} [opts.baseURL='https://api.openai.com/v1']
 * @param {string} [opts.model='gpt-4o-mini']
 * @param {number} [opts.timeoutMs=30000]
 * @returns {import('./index.js').LlmProvider}
 */
export function createOpenAIProvider(opts) {
  if (!opts.apiKey) {
    throw new Error('OpenAIProvider: apiKey required (set OPENAI_API_KEY in .env)');
  }
  return {
    info() {
      return { name: 'openai', model: opts.model || 'gpt-4o-mini', isLocal: false };
    },
    async complete(req) {
      // v0.5: wire to fetch('${baseURL}/chat/completions', ...)
      // For now, return a stub so the wiring is in place.
      throw new Error('OpenAIProvider.complete not yet implemented (v0.5)');
    },
  };
}
