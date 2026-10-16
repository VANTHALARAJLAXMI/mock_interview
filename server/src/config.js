import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const apiKey = (process.env.OLLAMA_API_KEY || '').trim();

export const config = {
  port: Number(process.env.PORT) || 5000,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Render (and similar hosts) sit one proxy in front of the app and set RENDER=true.
  // Rate limiting needs that hop trusted, or it rejects the X-Forwarded-For header.
  trustProxy: process.env.TRUST_PROXY !== undefined && process.env.TRUST_PROXY !== ''
    ? Number(process.env.TRUST_PROXY) || 0
    : process.env.RENDER
      ? 1
      : 0,
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 20,
  mongoUri: (process.env.MONGODB_URI || '').trim(),
  // Demo mode: sample questions + rule-based feedback, no external AI call.
  demoMode: bool(process.env.MOCK_AI, !apiKey),
  ollama: {
    apiKey,
    baseUrl: (process.env.OLLAMA_BASE_URL || 'https://ollama.com').replace(/\/+$/, ''),
    model: (process.env.OLLAMA_MODEL || 'gpt-oss:120b').trim(),
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS) || 60000,
  },
};
