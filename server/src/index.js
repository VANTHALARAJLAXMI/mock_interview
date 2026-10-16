import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { connectDb, getDb } from './db.js';
import { AiError } from './ollama.js';
import {
  ROLES,
  INTERVIEW_TYPES,
  DIFFICULTIES,
  LIMITS,
  ValidationError,
} from './validation.js';
import interviewRoutes from './routes/interview.js';
import historyRoutes from './routes/history.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await connectDb();

const app = express();
app.disable('x-powered-by');
// Only trust proxy headers when explicitly told how many proxy hops sit in front of the app.
if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Only trusted frontend origins get CORS headers.
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
  }),
);
app.use(express.json({ limit: '64kb' }));

// Public, non-secret settings the frontend needs.
app.get('/api/config', (req, res) => {
  res.json({
    roles: ROLES,
    interviewTypes: INTERVIEW_TYPES,
    difficulties: DIFFICULTIES,
    limits: { answer: LIMITS.answer, topic: LIMITS.topic },
    demoMode: config.demoMode,
    dbEnabled: Boolean(getDb()),
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimitPerMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
});

app.use('/api/interview', aiLimiter, interviewRoutes);
app.use('/api/interviews', historyRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Serve the built frontend if it exists (production: `npm run build`, then `npm start`).
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Central error handler: generic messages for clients, details only in the server log.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err instanceof AiError) return res.status(err.status).json({ error: err.message });
  console.error('[server] unexpected error:', err);
  return res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${config.port}`);
  console.log(
    config.demoMode
      ? '[ai] DEMO MODE — no Ollama API key set, using built-in sample questions and rule-based feedback.'
      : `[ai] Ollama Cloud enabled — model "${config.ollama.model}" at ${config.ollama.baseUrl}`,
  );
});
