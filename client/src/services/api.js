import { getClientId } from '../utils/storage.js';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check that the backend is running and try again.', 0);
  }

  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status}).`, res.status);
  }
  return data;
}

const clientHeaders = () => ({ 'X-Client-Id': getClientId() });

export const getConfig = () => request('/api/config');

export const generateQuestion = (payload, signal) =>
  request('/api/interview/question', { method: 'POST', body: payload, signal });

export const evaluateAnswer = (payload, signal) =>
  request('/api/interview/evaluate', { method: 'POST', body: payload, signal });

export const saveInterview = (session) =>
  request('/api/interviews', {
    method: 'POST',
    body: {
      role: session.role,
      topic: session.topic,
      difficulty: session.difficulty,
      interviewType: session.interviewType,
      startedAt: session.startedAt,
      answers: session.answers.map((a) => ({
        question: a.question,
        userAnswer: a.userAnswer,
        feedback: a.feedback,
      })),
    },
    headers: clientHeaders(),
  });

export const listInterviews = async () => {
  const data = await request('/api/interviews?limit=50', { headers: clientHeaders() });
  return data.sessions;
};

export const deleteInterview = (id) =>
  request(`/api/interviews/${encodeURIComponent(id)}`, { method: 'DELETE', headers: clientHeaders() });
