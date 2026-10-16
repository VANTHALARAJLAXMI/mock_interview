export const uniqueItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function averageScore(answers) {
  const scores = answers.map((a) => a.scoreEstimate).filter((n) => typeof n === 'number');
  if (!scores.length) return null;
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

export const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export function sessionToMarkdown(session) {
  const avg = averageScore(session.answers);
  const lines = [
    `# Mock interview report`,
    '',
    `- Role: ${session.role}`,
    `- Type: ${session.interviewType}`,
    `- Difficulty: ${session.difficulty}`,
    session.topic ? `- Topic: ${session.topic}` : null,
    `- Date: ${formatDate(session.createdAt || session.startedAt)}`,
    `- Questions answered: ${session.answers.length}`,
    avg === null ? null : `- Average estimated score: ${avg.toFixed(1)} / 10 (AI estimate, for practice only)`,
    '',
  ].filter((line) => line !== null);

  session.answers.forEach((a, i) => {
    const f = a.feedback || {};
    lines.push(`## Question ${i + 1}`, '', a.question, '', '**Your answer**', '', a.userAnswer, '');
    if (f.summary) lines.push('**Feedback**', '', f.summary, '');
    if (f.strengths?.length) lines.push('**Strengths**', ...f.strengths.map((s) => `- ${s}`), '');
    if (f.improvements?.length) lines.push('**To improve**', ...f.improvements.map((s) => `- ${s}`), '');
    if (f.suggestedApproach) lines.push('**Suggested approach**', '', f.suggestedApproach, '');
    if (typeof a.scoreEstimate === 'number') lines.push(`Estimated score: ${a.scoreEstimate} / 10`, '');
  });
  return lines.join('\n');
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
