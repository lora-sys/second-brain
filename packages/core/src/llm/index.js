// LLM adapter interface (ADR-0002)
// Pluggable, OpenAI-compatible first, local-echo fallback for testing.

/**
 * @typedef {Object} CompletionRequest
 * @property {string} prompt
 * @property {string} [system]
 * @property {Array<{role: string, content: string}>} [messages]
 * @property {number} [maxTokens=1000]
 * @property {number} [temperature=0.7]
 * @property {Object} [responseFormat] - {type: 'json_object'} for structured output
 * @property {string} [cacheKey] - if set, return cached result
 */

/**
 * @typedef {Object} CompletionResponse
 * @property {string} text
 * @property {Object} [parsed] - if responseFormat=json_object, parsed JSON
 * @property {number} tokensIn
 * @property {number} tokensOut
 * @property {string} model
 * @property {string} provider
 * @property {number} durationMs
 * @property {boolean} fromCache
 */

/**
 * @typedef {Object} ProviderInfo
 * @property {string} name
 * @property {string} model
 * @property {boolean} isLocal
 */

/**
 * @typedef {Object} LlmProvider
 * @property {function(CompletionRequest): Promise<CompletionResponse>} complete
 * @property {function(): ProviderInfo} info
 */

// LocalEchoProvider — no LLM, deterministic placeholder
// Useful for offline testing and as a fallback when no API key is configured.
export class LocalEchoProvider {
  info() {
    return { name: 'local-echo', model: 'deterministic-stub', isLocal: true };
  }
  async complete(req) {
    const text = `[local-echo] ${req.system || ''} ${req.prompt || ''}`.slice(0, 500);
    return {
      text,
      tokensIn: req.prompt.length,
      tokensOut: text.length,
      model: 'deterministic-stub',
      provider: 'local-echo',
      durationMs: 1,
      fromCache: false,
    };
  }
}

// ResponseCache — wrap any provider, key by cacheKey
export class CachedProvider {
  constructor(inner, opts = {}) {
    this.inner = inner;
    this.ttlMs = (opts.ttlSeconds || 0) * 1000;
    this.cache = new Map(); // cacheKey -> {ts, response}
  }
  info() { return this.inner.info(); }
  async complete(req) {
    if (!req.cacheKey || this.ttlMs <= 0) return this.inner.complete(req);
    const hit = this.cache.get(req.cacheKey);
    if (hit && Date.now() - hit.ts < this.ttlMs) {
      return { ...hit.response, fromCache: true };
    }
    const r = await this.inner.complete(req);
    this.cache.set(req.cacheKey, { ts: Date.now(), response: r });
    return r;
  }
  clear() { this.cache.clear(); }
}

// RetryProvider — wrap any provider with exponential backoff
export class RetryProvider {
  constructor(inner, opts = {}) {
    this.inner = inner;
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 500;
  }
  info() { return this.inner.info(); }
  async complete(req) {
    let lastErr;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.inner.complete(req);
      } catch (err) {
        lastErr = err;
        if (attempt < this.maxRetries && isRetryable(err)) {
          const delay = this.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }
}

function isRetryable(err) {
  // Retry on network errors and rate limits, not on 4xx (bad request)
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('rate limit') || msg.includes('429')) return true;
  if (msg.includes('timeout') || msg.includes('timed out')) return true;
  if (msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('etimedout')) return true;
  if (msg.includes('5') && msg.includes('internal server error')) return true;
  if (err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') return true;
  return false;
}
