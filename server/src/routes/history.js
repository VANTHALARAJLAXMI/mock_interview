import { Router } from 'express';
import { getDb } from '../db.js';
import { wrap } from '../utils.js';
import { validateSessionPayload } from '../validation.js';

const router = Router();
const CLIENT_ID_RE = /^[A-Za-z0-9-]{16,64}$/;

/**
 * Lightweight, anonymous ownership: each browser sends a random X-Client-Id and can only
 * see its own sessions. This is NOT user authentication. Add real accounts (see README)
 * before storing anything sensitive or exposing the app publicly.
 */
router.use((req, res, next) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database history is not enabled on this server.' });
  const clientId = req.get('x-client-id');
  if (!clientId || !CLIENT_ID_RE.test(clientId)) {
    return res.status(400).json({ error: 'Missing or invalid X-Client-Id header.' });
  }
  req.db = db;
  req.clientId = clientId;
  return next();
});

const toSession = (interview, answers = []) => ({
  id: String(interview._id),
  role: interview.role,
  topic: interview.topic,
  difficulty: interview.difficulty,
  interviewType: interview.interviewType,
  createdAt: interview.createdAt,
  completedAt: interview.completedAt,
  answers: answers.map((a) => ({
    question: a.question,
    userAnswer: a.userAnswer,
    feedback: a.feedback,
    scoreEstimate: a.scoreEstimate,
  })),
});

// POST /api/interviews — save a finished session
router.post(
  '/',
  wrap(async (req, res) => {
    const { Interview, Answer } = req.db;
    const data = validateSessionPayload(req.body);

    const interview = await Interview.create({
      clientId: req.clientId,
      role: data.role,
      topic: data.topic,
      difficulty: data.difficulty,
      interviewType: data.interviewType,
      status: 'completed',
      createdAt: data.startedAt,
      completedAt: data.completedAt,
    });
    await Answer.insertMany(
      data.answers.map((a) => ({ ...a, interviewId: interview._id, clientId: req.clientId })),
    );
    res.status(201).json({ id: String(interview._id) });
  }),
);

// GET /api/interviews?page=1&limit=20 — list this browser's sessions
router.get(
  '/',
  wrap(async (req, res) => {
    const { Interview, Answer } = req.db;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const interviews = await Interview.find({ clientId: req.clientId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const answers = await Answer.find({ interviewId: { $in: interviews.map((i) => i._id) } })
      .sort({ _id: 1 })
      .lean();

    const byInterview = new Map();
    for (const a of answers) {
      const key = String(a.interviewId);
      if (!byInterview.has(key)) byInterview.set(key, []);
      byInterview.get(key).push(a);
    }
    res.json({
      page,
      limit,
      sessions: interviews.map((i) => toSession(i, byInterview.get(String(i._id)))),
    });
  }),
);

// GET /api/interviews/:id
router.get(
  '/:id',
  wrap(async (req, res) => {
    const { Interview, Answer, mongoose } = req.db;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const interview = await Interview.findOne({ _id: req.params.id, clientId: req.clientId }).lean();
    if (!interview) return res.status(404).json({ error: 'Session not found.' });
    const answers = await Answer.find({ interviewId: interview._id }).sort({ _id: 1 }).lean();
    return res.json(toSession(interview, answers));
  }),
);

// DELETE /api/interviews/:id
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const { Interview, Answer, mongoose } = req.db;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const result = await Interview.deleteOne({ _id: req.params.id, clientId: req.clientId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Session not found.' });
    await Answer.deleteMany({ interviewId: req.params.id, clientId: req.clientId });
    return res.status(204).end();
  }),
);

export default router;
