export function ScoreBadge({ score, label = 'Estimated score' }) {
  const has = typeof score === 'number';
  return (
    <div
      className="score"
      style={{ '--pct': has ? score * 10 : 0 }}
      role="img"
      aria-label={has ? `${label}: ${score} out of 10` : `${label}: not available`}
    >
      <span className="score-num">{has ? score : '–'}</span>
      <span className="score-of">/10</span>
    </div>
  );
}

export default function FeedbackPanel({ feedback }) {
  return (
    <section className="card feedback" aria-labelledby="feedback-title">
      <div className="feedback-top">
        <div>
          <h3 id="feedback-title">Feedback</h3>
          <p className="feedback-summary">{feedback.summary}</p>
        </div>
        <ScoreBadge score={feedback.scoreEstimate} />
      </div>

      <div className="feedback-cols">
        {feedback.strengths?.length > 0 && (
          <div>
            <h4>What worked</h4>
            <ul className="ticks good">
              {feedback.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.improvements?.length > 0 && (
          <div>
            <h4>What to improve</h4>
            <ul className="ticks work">
              {feedback.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {feedback.suggestedApproach && (
        <div className="approach">
          <h4>A stronger structure</h4>
          <p>{feedback.suggestedApproach}</p>
        </div>
      )}

      <p className="fineprint">
        The score is an AI estimate for practice only. It does not predict real interview results.
      </p>
    </section>
  );
}
