const DEFAULT_GATEWAY = 'https://ai-gateway.vercel.sh/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function gatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY && String(process.env.AI_GATEWAY_API_KEY).trim());
}
function groqConfigured() {
  return Boolean(process.env.GROQ_API_KEY && String(process.env.GROQ_API_KEY).trim());
}
function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());
}

function detectProvider(modelId, preferred) {
  const id = String(modelId || '').toLowerCase();
  if (preferred && preferred !== 'auto') return preferred;
  if (id.includes('allam') || id.includes('llama') || id.includes('gpt-oss') || id.includes('qwen') || id.startsWith('meta-llama/')) return 'groq';
  if (id.includes('gemini') || id.startsWith('google/')) return 'gemini';
  if (id.includes('nemotron') || id.startsWith('openai/') || id.startsWith('anthropic/')) return 'gateway';
  return preferred || 'gateway';
}

async function chatViaOpenAICompat({ base, apiKey, model, messages, maxTokens }) {
  const resp = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('[aiChat]', base, resp.status, errText.slice(0, 280));
    throw new Error(`AI provider error (${resp.status})`);
  }
  const data = await resp.json();
  return { text: String(data?.choices?.[0]?.message?.content || '').trim(), model: data?.model || model, provider: base };
}

async function chatViaGemini({ apiKey, model, system, user, maxTokens }) {
  let modelName = String(model || 'gemini-2.5-flash').replace(/^google\//, '');
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = system
    ? [{ role: 'user', parts: [{ text: `System: ${system}\n\nUser: ${user}` }] }]
    : [{ role: 'user', parts: [{ text: user }] }];
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 } }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('[gemini]', resp.status, errText.slice(0, 280));
    throw new Error(`Gemini error (${resp.status})`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return { text: String(text).trim(), model: modelName, provider: 'gemini' };
}

async function chatCompletion(opts = {}) {
  const { system, user, maxTokens = 800, model: modelOverride, provider: providerHint, fallbackModel, fallbackProvider } = opts;
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });
  const primaryModel = modelOverride || process.env.AI_GATEWAY_MODEL || 'allam-2-7b';
  const tryOrder = [];
  const p1 = detectProvider(primaryModel, providerHint);
  tryOrder.push({ model: primaryModel, provider: p1 });
  if (fallbackModel && fallbackModel !== primaryModel) {
    tryOrder.push({ model: fallbackModel, provider: detectProvider(fallbackModel, fallbackProvider || 'gateway') });
  } else if (p1 !== 'gateway' && gatewayConfigured()) {
    tryOrder.push({ model: 'openai/gpt-4o-mini', provider: 'gateway' });
  }
  let lastErr = null;
  for (const attempt of tryOrder) {
    try {
      if (attempt.provider === 'groq') {
        if (!groqConfigured()) throw new Error('GROQ_API_KEY missing');
        return await chatViaOpenAICompat({
          base: GROQ_BASE,
          apiKey: process.env.GROQ_API_KEY.trim(),
          model: attempt.model.replace(/^groq\//, ''),
          messages,
          maxTokens,
        });
      }
      if (attempt.provider === 'gemini') {
        if (!geminiConfigured()) throw new Error('GEMINI_API_KEY missing');
        return await chatViaGemini({ apiKey: process.env.GEMINI_API_KEY.trim(), model: attempt.model, system, user, maxTokens });
      }
      if (!gatewayConfigured()) throw new Error('AI_GATEWAY_API_KEY missing');
      return await chatViaOpenAICompat({
        base: process.env.AI_GATEWAY_BASE_URL || DEFAULT_GATEWAY,
        apiKey: process.env.AI_GATEWAY_API_KEY.trim(),
        model: attempt.model,
        messages,
        maxTokens,
      });
    } catch (err) {
      lastErr = err;
      console.error('[chatCompletion] attempt failed', attempt.provider, attempt.model, err.message);
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

function providersStatus() {
  return {
    gateway: gatewayConfigured(),
    groq: groqConfigured(),
    gemini: geminiConfigured(),
    tavily: Boolean(process.env.TAVILY_API_KEY && String(process.env.TAVILY_API_KEY).trim()),
  };
}

async function webSearch(query, maxResults = 5) {
  const key = process.env.TAVILY_API_KEY && String(process.env.TAVILY_API_KEY).trim();
  if (!key) return { ok: false, context: '', note: 'no_search_key' };
  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query: String(query).slice(0, 400), max_results: maxResults, search_depth: 'basic' }),
  });
  if (!resp.ok) return { ok: false, context: '', note: 'search_failed' };
  const data = await resp.json();
  const results = Array.isArray(data.results) ? data.results : [];
  const context = results.slice(0, maxResults)
    .map((r, i) => `[${i + 1}] ${r.title || ''}\n${r.content || r.snippet || ''}\nURL: ${r.url || ''}`)
    .join('\n\n').slice(0, 6000);
  return { ok: true, context, note: 'tavily' };
}

module.exports = { gatewayConfigured, groqConfigured, geminiConfigured, providersStatus, chatCompletion, webSearch };
