import { useCallback, useState } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import usePersistentState from '../hooks/usePersistentState.js';

export default function AnswerEditor({
  value,
  setValue,
  onEdit,
  onSubmit,
  onSkip,
  busy,
  error,
  maxLength,
  lang,
}) {
  const [consented, setConsented] = usePersistentState('mia.micConsent', false, 'sessionStorage');
  const [showConsent, setShowConsent] = useState(false);

  const appendFinal = useCallback(
    (text) => {
      const addition = text.trim();
      if (!addition) return;
      setValue((prev) => {
        const separator = prev && !/\s$/.test(prev) ? ' ' : '';
        return `${prev}${separator}${addition}`.slice(0, maxLength);
      });
    },
    [setValue, maxLength],
  );

  const rec = useSpeechRecognition({ lang, onFinalText: appendFinal });

  const startRecording = () => {
    setShowConsent(false);
    rec.start();
  };

  const onMicClick = () => {
    if (rec.listening) {
      rec.stop();
      return;
    }
    if (!consented) {
      setShowConsent(true);
      return;
    }
    startRecording();
  };

  const confirmConsent = () => {
    setConsented(true);
    startRecording();
  };

  const submit = () => {
    rec.stop();
    onSubmit();
  };

  return (
    <section className="card answer" aria-labelledby="answer-label">
      <div className="answer-head">
        <label id="answer-label" htmlFor="answer-input">
          Your answer
        </label>
        <span className="count" aria-hidden="true">
          {value.length} / {maxLength}
        </span>
      </div>

      <textarea
        id="answer-input"
        rows={8}
        value={value}
        maxLength={maxLength}
        disabled={busy}
        placeholder="Type your answer, or press the microphone and speak. You can edit the text before you submit."
        onChange={(e) => {
          setValue(e.target.value);
          onEdit();
        }}
      />

      {rec.listening && (
        <div className="onair" role="status">
          <span className="bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            Listening — speak your answer.
            {rec.interim && <em> {rec.interim}</em>}
          </span>
        </div>
      )}

      {showConsent && (
        <div className="consent" role="group" aria-labelledby="consent-title">
          <h4 id="consent-title">Use your microphone?</h4>
          <p>
            Your browser will ask for microphone access. Your speech is turned into text that you can
            review and edit before submitting. This app doesn’t record or store audio, but Chrome and
            Edge may send it to their own speech service to transcribe it.
          </p>
          <div className="actions">
            <button type="button" className="btn primary" onClick={confirmConsent}>
              Allow and start
            </button>
            <button type="button" className="btn ghost" onClick={() => setShowConsent(false)}>
              Not now
            </button>
          </div>
        </div>
      )}

      {rec.error && (
        <p className="alert warn" role="alert">
          {rec.error}
        </p>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      <div className="actions answer-actions">
        <button type="button" className="btn primary" onClick={submit} disabled={busy || !value.trim()}>
          {busy ? 'Evaluating…' : 'Submit answer'}
        </button>

        {rec.supported ? (
          <button
            type="button"
            className={`btn mic${rec.listening ? ' live' : ''}`}
            onClick={onMicClick}
            disabled={busy}
            aria-pressed={rec.listening}
          >
            <span className="mic-dot" aria-hidden="true" />
            {rec.listening ? 'Stop recording' : 'Speak answer'}
          </button>
        ) : (
          <span className="hint">
            Speech input isn’t supported in this browser. Typing works everywhere; Chrome or Edge
            support voice.
          </span>
        )}

        <button type="button" className="btn ghost push-right" onClick={onSkip} disabled={busy}>
          Skip question
        </button>
      </div>
    </section>
  );
}
