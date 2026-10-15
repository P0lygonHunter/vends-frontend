/**
 * Vercel AI Gateway (OpenAI-compatible chat completions).
 * Env:
 *   AI_GATEWAY_API_KEY  — required for live LLM
 *   AI_GATEWAY_BASE_URL — default https://ai-gateway.vercel.sh/v1
 *   AI_GATEWAY_MODEL    — e.g. openai/gpt-4o-mini or a free-tier model id
 */

const DEFAULT_BASE = 'https://ai-gateway.vercel.sh/v1';

function gatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY && String(process.env.AI_GATEWAY_API_KEY).trim());
}

/**
 * @param {{ system?: string, user: string, maxTokens?: number }} opts
 * @returns {Promise<{ text: string, model: string } | null>}
 */
async function chatCompletion({ system, user, maxTokens = 800 }) {
  const apiKey = process.env.AI_GATEWAY_API_KEY && String(process.env.AI_GATEWAY_API_KEY).trim();
  if (!apiKey) return null;

  const base = (process.env.AI_GATEWAY_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o-mini';

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

module.exports = {
  gatewayConfigured,
  chatCompletion,
};
