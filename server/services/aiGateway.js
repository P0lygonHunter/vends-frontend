/**
 * Vercel AI Gateway (OpenAI-compatible).
 * Key: AI_GATEWAY_API_KEY (Vercel env only).
 */

const DEFAULT_BASE = 'https://ai-gateway.vercel.sh/v1';

function gatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY && String(process.env.AI_GATEWAY_API_KEY).trim());
}

/**
 * @param {{ system?: string, user: string, maxTokens?: number, model?: string }} opts
 */
async function chatCompletion({ system, user, maxTokens = 800, model: modelOverride } = {}) {
  const apiKey = process.env.AI_GATEWAY_API_KEY && String(process.env.AI_GATEWAY_API_KEY).trim();
  if (!apiKey) return null;

  const base = (process.env.AI_GATEWAY_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const model = modelOverride || process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini';

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('[aiGateway]', resp.status, errText.slice(0, 300));
    throw new Error(`AI Gateway error (${resp.status})`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { text: String(text).trim(), model: data?.model || model };
}

/**
 * Optional web search via Tavily (platform env TAVILY_API_KEY).
 * Returns short context string or ''.
 */
async function webSearch(query, maxResults = 5) {
  const key = process.env.TAVILY_API_KEY && String(process.env.TAVILY_API_KEY).trim();
  if (!key) return { ok: false, context: '', note: 'no_search_key' };

  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query: String(query).slice(0, 400),
      max_results: maxResults,
      search_depth: 'basic',
    }),
  });
  if (!resp.ok) {
    console.error('[webSearch]', resp.status);
    return { ok: false, context: '', note: 'search_failed' };
  }
  const data = await resp.json();
  const results = Array.isArray(data.results) ? data.results : [];
  const context = results
    .slice(0, maxResults)
    .map((r, i) => `[${i + 1}] ${r.title || ''}\n${r.content || r.snippet || ''}\nURL: ${r.url || ''}`)
    .join('\n\n')
    .slice(0, 6000);
  return { ok: true, context, note: 'tavily' };
}

module.exports = {
  gatewayConfigured,
  chatCompletion,
  webSearch,
};
