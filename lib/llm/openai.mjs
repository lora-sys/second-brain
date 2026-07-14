// OpenAI-compatible provider. v0.5 implementation.
// Works with OpenAI, Ollama (with /v1/chat/completions), LM Studio, etc.
//
// Set OPENAI_API_KEY env var to enable. If unset, callers should fall
// back to LocalEchoProvider.

import { performance } from 'node:perf_hooks';

/**
 * Create an OpenAI-compatible provider.
 * @param {Object} opts
 * @param {string} [opts.apiKey] - env var name e.g. 'OPENAI_API_KEY' or literal
 * @param {string} [opts.baseURL='https://api.openai.com/v1']
 * @param {string} [opts.model='gpt-4o-mini']
 * @param {number} [opts.timeoutMs=30000]
 * @returns {import('./index.js').LlmProvider}
 */
export function createOpenAIProvider(opts = {}) {
  const baseURL = (opts.baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = opts.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const timeoutMs = opts.timeoutMs || 30000;
  // Resolve API key: literal value, then env var name in opts.apiKey,
  // then OPENAI_API_KEY env.
  let apiKey = opts.apiKey || '';
  if (apiKey && apiKey.startsWith('env:')) {
    apiKey = process.env[apiKey.slice(4)] || '';
  }
  if (!apiKey) apiKey = process.env.OPENAI_API_KEY || '';

  return {
    info() {
      return { name: 'openai-compatible', model, isLocal: baseURL.includes('localhost') || baseURL.includes('127.0.0.1') };
    },
    async complete(req) {
      if (!apiKey && !this.info().isLocal) {
        throw new Error('OpenAIProvider: apiKey required (set OPENAI_API_KEY in .env or pass apiKey)');
      }
      const messages = [];
      if (req.system) messages.push({ role: 'system', content: req.system });
      if (req.messages && Array.isArray(req.messages)) messages.push(...req.messages);
      if (req.prompt) messages.push({ role: 'user', content: req.prompt });
      const body = {
        model,
        messages,
        max_tokens: req.maxTokens || 1000,
        temperature: req.temperature ?? 0.7,
      };
      if (req.responseFormat && req.responseFormat.type === 'json_object') {
        body.response_format = { type: 'json_object' };
      }
      const t0 = performance.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
        const resp = await fetch(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          throw new Error(`OpenAI API ${resp.status}: ${errText.slice(0, 200)}`);
        }
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};
        const out = {
          text,
          tokensIn: usage.prompt_tokens || 0,
          tokensOut: usage.completion_tokens || 0,
          model: data.model || model,
          provider: 'openai-compatible',
          durationMs: Math.round(performance.now() - t0),
          fromCache: false,
        };
        if (req.responseFormat && req.responseFormat.type === 'json_object') {
          try { out.parsed = JSON.parse(text); } catch {}
        }
        return out;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
