import { useCallback, useEffect, useRef, useState } from 'react';
import { generateQuestion, evaluateAnswer } from '../services/api.js';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis.js';
import usePersistentState from '../hooks/usePersistentState.js';
import QuestionCard from './QuestionCard.jsx';
import AnswerEditor from './AnswerEditor.jsx';
import FeedbackPanel from './FeedbackPanel.jsx';

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-AU', label: 'English (Australia)' },
];

function defaultLanguage() {
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return LANGUAGES.find((l) => l.code.toLowerCase() === (nav || '').toLowerCase())?.code || 'en-US';
}

export default function InterviewScreen({ setup, limits, onFinish, onExit }) {
  const total = setup.questionCount;

  const [phase, setPhase] = useState('loading'); // loading | answering | evaluating | feedback | error
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState([]);
  const [usedDemo, setUsedDemo] = useState(false);

  const [lang, setLang] = usePersistentState('mia.lang', defaultLanguage());
  const [autoRead, setAutoRead] = usePersistentState('mia.autoRead', false);

  const askedRef = useRef([]);
  const requestRef = useRef(null);
  const spokenRef = useRef('');

  const speech = useSpeechSynthesis(lang);
  const { speak, stop: stopSpeech } = speech;

  const baseConfig = {
    role: setup.role,
    interviewType: setup.interviewType,
    difficulty: setup.difficulty,
    topic: setup.topic,
  };

  const loadQuestion = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    stopSpeech();
    setPhase('loading');
    setError('');
    setFeedback(null);
    setAnswer('');

    try {
      const data = await generateQuestion(
        {
          role: setup.role,
          interviewType: setup.interviewType,
          difficulty: setup.difficulty,
          topic: setup.topic,
          previousQuestions: askedRef.current,
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      askedRef.current = [...askedRef.current, data.question];
      setQuestion(data.question);
      if (data.demo) setUsedDemo(true);
      setPhase('answering');
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      setError(err.message);
      setPhase('error');
    }
  }, [setup, stopSpeech]);

  // Load the first question once; cancel any in-flight request on unmount.
  useEffect(() => {
    loadQuestion();
    return () => requestRef.current?.abort();
  }, [loadQuestion]);

  // Optional auto-read of each new question.
  useEffect(() => {
    if (phase === 'answering' && autoRead && question && spokenRef.current !== question) {
      spokenRef.current = question;
      speak(question);
    }
  }, [phase, question, autoRead, speak]);

  const submit = async () => {
    const text = answer.trim();
    if (text.length < 5) {
      setError('Write or say a little more before you submit.');
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    stopSpeech();
    setError('');
    setPhase('evaluating');
    try {
      const data = await evaluateAnswer({ ...baseConfig, question, answer: text }, controller.signal);
      if (controller.signal.aborted) return;
      setFeedback(data.feedback);
      if (data.demo) setUsedDemo(true);
      setCompleted((prev) => [
        ...prev,
        {
          question,
          userAnswer: text,
          feedback: data.feedback,
          scoreEstimate: data.feedback.scoreEstimate,
        },
      ]);
      setPhase('feedback');
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      setError(err.message);
      setPhase('answering'); // keep the typed answer so nothing is lost
    }
  };

  const isLast = completed.length >= total;

  const endEarly = () => {
    if (completed.length === 0) {
      onExit();
      return;
    }
    if (isLast || window.confirm('End the interview now and view your report?')) {
      onFinish(completed, usedDemo);
    }
  };

  const currentIndex = phase === 'feedback' ? completed.length - 1 : completed.length;
  const number = Math.min(total, currentIndex + 1);

  return (
    <section className="interview" aria-labelledby="interview-title">
      <div className="iv-head">
        <div>
          <h2 id="interview-title">
            Question {number} of {total}
          </h2>
          <ul className="chips" aria-label="Interview settings">
            <li>{setup.role}</li>
            <li>{setup.interviewType}</li>
            <li>{setup.difficulty}</li>
            {setup.topic && <li>{setup.topic}</li>}
          </ul>
        </div>
        <button type="button" className="btn ghost" onClick={endEarly}>
          {completed.length === 0 ? 'Exit' : 'End interview'}
        </button>
      </div>

      <div className="iv-body">
        <ol className="rail" aria-label="Interview progress">
          {Array.from({ length: total }, (_, i) => {
            const done = i < completed.length;
            const current = i === currentIndex;
            const score = done ? completed[i].scoreEstimate : null;
            return (
              <li
                key={i}
                className={`${done ? 'done' : ''} ${current ? 'current' : ''}`}
                aria-current={current ? 'step' : undefined}
              >
                <span className="node">{i + 1}</span>
                <span className="rail-text">
                  Question {i + 1}
                  {done && typeof score === 'number' && <small>{score}/10</small>}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="iv-main">
          {speech.supported && (
            <details className="voice-settings">
              <summary>Voice settings</summary>
              <div className="voice-grid">
                <div className="field">
                  <label htmlFor="lang">Accent for speaking and listening</label>
                  <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="check compact">
                  <input
                    type="checkbox"
                    checked={autoRead}
                    onChange={(e) => setAutoRead(e.target.checked)}
                  />
                  <span>Read each new question aloud</span>
                </label>
              </div>
            </details>
          )}

          {phase === 'loading' && (
            <div className="loading" role="status">
              <span className="spinner" aria-hidden="true" />
              Preparing your question…
            </div>
          )}

          {phase === 'error' && (
            <div className="card error-card" role="alert">
              <h3>We couldn’t get a question</h3>
              <p>{error}</p>
              <div className="actions">
                <button type="button" className="btn primary" onClick={loadQuestion}>
                  Try again
                </button>
                <button type="button" className="btn ghost" onClick={endEarly}>
                  {completed.length === 0 ? 'Back to setup' : 'View report'}
                </button>
              </div>
            </div>
          )}

          {phase !== 'loading' && phase !== 'error' && (
            <>
              <QuestionCard question={question} speech={speech} />

              {(phase === 'answering' || phase === 'evaluating') && (
                <AnswerEditor
                  value={answer}
                  setValue={setAnswer}
                  onEdit={() => setError('')}
                  onSubmit={submit}
                  onSkip={loadQuestion}
                  busy={phase === 'evaluating'}
                  error={error}
                  maxLength={limits.answer}
                  lang={lang}
                />
              )}

              {phase === 'feedback' && feedback && (
                <>
                  <details className="card your-answer">
                    <summary>Your answer</summary>
                    <p>{completed[completed.length - 1]?.userAnswer}</p>
                  </details>
                  <FeedbackPanel feedback={feedback} />
                  <div className="actions">
                    {isLast ? (
                      <button type="button" className="btn primary large" onClick={() => onFinish(completed, usedDemo)}>
                        Finish and view report
                      </button>
                    ) : (
                      <button type="button" className="btn primary large" onClick={loadQuestion}>
                        Next question
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
