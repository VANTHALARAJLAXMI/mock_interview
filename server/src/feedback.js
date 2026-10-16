export class MalformedFeedbackError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MalformedFeedbackError';
  }
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const str = (value, max) =>
  typeof value === 'string' ? value.replace(CONTROL_CHARS, '').trim().slice(0, max) : '';

const list = (value, maxItems, maxLen) =>
  Array.isArray(value)
    ? value.map((item) => str(item, maxLen)).filter(Boolean).slice(0, maxItems)
    : [];

/**
 * Turns whatever the model returned into the predictable shape the frontend expects.
 * Throws MalformedFeedbackError if the essentials are missing.
 */
export function normalizeFeedback(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new MalformedFeedbackError('Feedback is not an object.');
  }
  const summary = str(raw.summary, 600);
  if (!summary) throw new MalformedFeedbackError('Feedback has no summary.');

  let score = Number(raw.scoreEstimate);
  score = Number.isFinite(score) ? Math.min(10, Math.max(0, Math.round(score))) : null;

  return {
    summary,
    strengths: list(raw.strengths, 5, 240),
    improvements: list(raw.improvements, 5, 240),
    suggestedApproach: str(raw.suggestedApproach, 800),
    scoreEstimate: score,
  };
}
