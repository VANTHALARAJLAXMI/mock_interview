export default function QuestionCard({ question, speech }) {
  return (
    <section className="question" aria-labelledby="question-label">
      <p id="question-label" className="q-from">
        Interviewer asks
      </p>
      <p className="q-text" aria-live="polite">
        {question}
      </p>
      <div className="q-tools">
        {speech.supported ? (
          <button
            type="button"
            className="btn on-ink"
            onClick={() => (speech.speaking ? speech.stop() : speech.speak(question))}
          >
            {speech.speaking ? 'Stop audio' : 'Read aloud'}
          </button>
        ) : (
          <span className="hint-on-ink">Read aloud isn’t available in this browser.</span>
        )}
        {speech.noVoices && (
          <span className="hint-on-ink">No speech voices were found on this device.</span>
        )}
        {speech.error && (
          <span className="hint-on-ink" role="alert">
            {speech.error}
          </span>
        )}
      </div>
    </section>
  );
}
