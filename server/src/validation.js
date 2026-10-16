import { normalizeFeedback } from './feedback.js';

export const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Mobile App Developer',
  'Data Analyst',
  'Data Scientist',
  'DevOps Engineer',
  'QA / Test Engineer',
  'Product Manager',
  'General HR Candidate',
];
export const INTERVIEW_TYPES = ['Technical', 'HR / Behavioral', 'Mixed'];
export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export const LIMITS = {
  topic: 100,
  question: 1000,
  answer: 4000,
  previousQuestions: 10,
  answersPerSession: 20,
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = 400;
  }
}

// Strip control characters (keeps \n and \t).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanString(value, { max, field, required = false }) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`);
  const cleaned = value.replace(CONTROL_CHARS, '').trim();
  if (required && !cleaned) throw new ValidationError(`${field} is required.`);
  if (cleaned.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }
  return cleaned;
}

function assertObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }
  return body;
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value;
}

export function validateConfig(body) {
  assertObject(body);
  return {
    role: oneOf(body.role, ROLES, 'role'),
    interviewType: oneOf(body.interviewType, INTERVIEW_TYPES, 'interviewType'),
    difficulty: oneOf(body.difficulty, DIFFICULTIES, 'difficulty'),
    topic: cleanString(body.topic, { max: LIMITS.topic, field: 'topic' }),
  };
}

export function validateQuestionRequest(body) {
  const config = validateConfig(body);
  let previousQuestions = [];
  if (body.previousQuestions !== undefined) {
    if (!Array.isArray(body.previousQuestions)) {
      throw new ValidationError('previousQuestions must be a list.');
    }
    previousQuestions = body.previousQuestions
      .slice(-LIMITS.previousQuestions)
      .map((q, i) => cleanString(q, { max: LIMITS.question, field: `previousQuestions[${i}]` }))
      .filter(Boolean);
  }
  return { ...config, previousQuestions };
}

export function validateEvaluateRequest(body) {
  const config = validateConfig(body);
  return {
    ...config,
    question: cleanString(body.question, { max: LIMITS.question, field: 'question', required: true }),
    answer: cleanString(body.answer, { max: LIMITS.answer, field: 'answer', required: true }),
  };
}

export function validateSessionPayload(body) {
  const config = validateConfig(body);
  if (
    !Array.isArray(body.answers) ||
    body.answers.length === 0 ||
    body.answers.length > LIMITS.answersPerSession
  ) {
    throw new ValidationError(
      `answers must be a list of 1 to ${LIMITS.answersPerSession} items.`,
    );
  }
  const answers = body.answers.map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`answers[${i}] must be an object.`);
    }
    let feedback;
    try {
      feedback = normalizeFeedback(item.feedback);
    } catch {
      throw new ValidationError(`answers[${i}].feedback is invalid.`);
    }
    return {
      question: cleanString(item.question, {
        max: LIMITS.question,
        field: `answers[${i}].question`,
        required: true,
      }),
      userAnswer: cleanString(item.userAnswer, {
        max: LIMITS.answer,
        field: `answers[${i}].userAnswer`,
        required: true,
      }),
      feedback,
      scoreEstimate: feedback.scoreEstimate,
    };
  });

  let startedAt = new Date(body.startedAt);
  const now = new Date();
  if (Number.isNaN(startedAt.getTime()) || startedAt > now) startedAt = now;
  return { ...config, answers, startedAt, completedAt: now };
}
