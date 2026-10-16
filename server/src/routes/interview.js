import { Router } from 'express';
import { config } from '../config.js';
import { wrap } from '../utils.js';
import { validateQuestionRequest, validateEvaluateRequest } from '../validation.js';
import { generateQuestion, evaluateAnswer } from '../interviewAi.js';
import { demoQuestion, demoEvaluate } from '../demo.js';

const router = Router();

// POST /api/interview/question  { role, topic, difficulty, interviewType, previousQuestions? }
router.post(
  '/question',
  wrap(async (req, res) => {
    const input = validateQuestionRequest(req.body);
    const question = config.demoMode ? demoQuestion(input) : await generateQuestion(input);
    res.json({ question, demo: config.demoMode });
  }),
);

// POST /api/interview/evaluate  { question, answer, role, difficulty, interviewType, topic? }
router.post(
  '/evaluate',
  wrap(async (req, res) => {
    const input = validateEvaluateRequest(req.body);
    const feedback = config.demoMode ? demoEvaluate(input) : await evaluateAnswer(input);
    res.json({ feedback, demo: config.demoMode });
  }),
);

export default router;
