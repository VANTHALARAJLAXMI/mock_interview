import { ScoreBadge } from './FeedbackPanel.jsx';
import FeedbackPanel from './FeedbackPanel.jsx';
import {
  averageScore,
  uniqueItems,
  formatDate,
  sessionToMarkdown,
  downloadText,
} from '../utils/report.js';

function SaveNotice({ saveState }) {
  if (!saveState) return null;
  if (saveState.status === 'saving') return <p className="alert info" role="status">Saving this session…</p>;
  if (saveState.status === 'saved') {
    return (
      <p className="alert info" role="status">
        Saved to {saveState.where}. You can delete it from History at any time.
      </p>
    );
  }
  if (saveState.status === 'error') {
    return (
      <p className="alert warn" role="alert">
        This session couldn’t be saved: {saveState.message} You can still download the report below.
      </p>
    );
  }
  if (saveState.status === 'skipped') {
    return <p className="alert info">This session wasn’t saved, as you chose. Download it below to keep a copy.</p>;
  }
  return null;
}

export default function Report({ session, saveState, onNew, onBack, backLabel }) {
  const answers = session.answers || [];
  const avg = averageScore(answers);
  const strengths = uniqueItems(answers.flatMap((a) => a.feedback?.strengths || [])).slice(0, 6);
  const improvements = uniqueItems(answers.flatMap((a) => a.feedback?.improvements || [])).slice(0, 6);
  const date = formatDate(session.createdAt || session.startedAt);

  const download = () => {
    const stamp = new Date(session.createdAt || session.startedAt || Date.now())
      .toISOString()
      .slice(0, 10);
    downloadText(`mock-interview-${stamp}.md`, sessionToMarkdown(session));
  };

  const printReport = () => {
    // Closed <details> hide their content when printing, so open them first.
    document.querySelectorAll('.q-item').forEach((el) => {
      el.open = true;
    });
    window.print();
  };

  return (
    <section className="report" aria-labelledby="report-title">
      <div className="report-head">
        <h2 id="report-title">Session report</h2>
        <ul className="chips" aria-label="Session details">
          <li>{session.role}</li>
          <li>{session.interviewType}</li>
          <li>{session.difficulty}</li>
          {session.topic && <li>{session.topic}</li>}
          {date && <li>{date}</li>}
        </ul>
      </div>

      <SaveNotice saveState={saveState} />
      {session.demo && (
        <p className="alert warn">
          Some feedback in this session came from demo mode (simple built-in rules, not an AI model).
        </p>
      )}

      <div className="card summary">
        <ScoreBadge score={avg === null ? null : Math.round(avg * 10) / 10} label="Average estimated score" />
        <div>
          <p className="summary-line">
            You answered <strong>{answers.length}</strong> {answers.length === 1 ? 'question' : 'questions'}.
            {avg !== null && (
              <>
                {' '}
                Your average estimated score is <strong>{avg.toFixed(1)} out of 10</strong>.
              </>
            )}
          </p>
          <p className="fineprint">
            Scores and feedback are AI estimates for practice. They are not verified results or a
            prediction of hiring outcomes.
          </p>
        </div>
      </div>

      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="themes">
          {strengths.length > 0 && (
            <div className="card">
              <h3>What kept working</h3>
              <ul className="ticks good">
                {strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {improvements.length > 0 && (
            <div className="card">
              <h3>Practise next</h3>
              <ul className="ticks work">
                {improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h3 className="section-title">Question by question</h3>
      <div className="q-list">
        {answers.map((a, i) => (
          <details key={i} className="card q-item" open={answers.length === 1}>
            <summary>
              <span className="q-num">{i + 1}</span>
              <span className="q-summary">{a.question}</span>
              <span className="q-score">
                {typeof a.scoreEstimate === 'number' ? `${a.scoreEstimate}/10` : '–'}
              </span>
            </summary>
            <div className="q-detail">
              <h4>Your answer</h4>
              <p className="user-answer">{a.userAnswer}</p>
              {a.feedback && <FeedbackPanel feedback={a.feedback} />}
            </div>
          </details>
        ))}
      </div>

      <div className="actions report-actions">
        <button type="button" className="btn primary" onClick={onNew}>
          Start a new interview
        </button>
        <button type="button" className="btn" onClick={download}>
          Download report (.md)
        </button>
        <button type="button" className="btn ghost" onClick={printReport}>
          Print
        </button>
        {onBack && (
          <button type="button" className="btn ghost" onClick={onBack}>
            {backLabel}
          </button>
        )}
      </div>
    </section>
  );
}
