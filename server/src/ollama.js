import { config } from './config.js';

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}

/**
 * Direct Ollama Cloud API. No local Ollama install.
 *   POST https://ollama.com/api/chat
 *   Authorization: Bearer <OLLAMA_API_KEY>
 *   { model, messages, stream: false, format?: "json", options? }
 *   -> { message: { content } }
 * The key stays on the server. The browser never receives it.
 */
export async function chat({ messages, json = false, temperature = 0.7 }) {
  const { apiKey, baseUrl, model, timeoutMs } = config.ollama;
  if (!apiKey) throw new AiError('The AI service is not configured on the server.', 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(json ? { format: 'json' } : {}),
        options: { temperature },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Diagnostic detail stays in the server log; the client only gets a generic message.
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      console.error(`[ollama] HTTP ${res.status}: ${detail}`);
      if (res.status === 401 || res.status === 403) {
        throw new AiError('The AI service rejected the server credentials.', 502);
      }
      if (res.status === 404) throw new AiError('The configured AI model was not found.', 502);
      if (res.status === 429) {
        throw new AiError(
          'The AI service is busy or its usage limit was reached. Please try again shortly.',
          429,
        );
      }
      throw new AiError('The AI service returned an error. Please try again.', 502);
    }

    const data = await res.json();
    const content = data?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiError('The AI service returned an empty response.', 502);
    }
    return content;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err.name === 'AbortError') {
      throw new AiError('The AI service took too long to respond. Please retry.', 504);
    }
    console.error('[ollama] request failed:', err.message);
    throw new AiError('Could not reach the AI service. Please try again.', 502);
  } finally {
    clearTimeout(timer);
  }
}
