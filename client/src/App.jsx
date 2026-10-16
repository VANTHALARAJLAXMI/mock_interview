import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import SetupForm from './components/SetupForm.jsx';
import InterviewScreen from './components/InterviewScreen.jsx';
import Report from './components/Report.jsx';
import History from './components/History.jsx';
import { getConfig } from './services/api.js';
import { createHistoryStore } from './services/history.js';

export default function App() {
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');
  const [stage, setStage] = useState('setup'); // setup | interview | report | history
  const [setup, setSetup] = useState(null);
  const [report, setReport] = useState(null);
  const [reportFrom, setReportFrom] = useState('new'); // new | history
  const [saveState, setSaveState] = useState(null);

  const loadConfig = useCallback(async () => {
    setConfigError('');
    try {
      setConfig(await getConfig());
    } catch (err) {
      setConfigError(err.message);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const store = useMemo(() => createHistoryStore(Boolean(config?.dbEnabled)), [config?.dbEnabled]);

  const goNew = () => {
    setStage('setup');
    setSetup(null);
  };

  // Header navigation: ask before abandoning an interview in progress.
  const confirmLeave = () =>
    stage !== 'interview' || window.confirm('Leave this interview? Your progress will be lost.');

  const headerNew = () => {
    if (confirmLeave()) goNew();
  };

  const headerHistory = () => {
    if (confirmLeave()) setStage('history');
  };

  const startInterview = (values) => {
    setSetup({ ...values, startedAt: new Date().toISOString() });
    setSaveState(null);
    setStage('interview');
  };

  const finishInterview = async (answers, demo) => {
    const session = { ...setup, answers, demo };
    setReport(session);
    setReportFrom('new');
    setStage('report');

    if (!setup.save) {
      setSaveState({ status: 'skipped' });
      return;
    }
    setSaveState({ status: 'saving' });
    try {
      await store.save(session);
      setSaveState({ status: 'saved', where: store.label });
    } catch (err) {
      setSaveState({ status: 'error', message: err.message });
    }
  };

  const openSaved = (session) => {
    setReport(session);
    setReportFrom('history');
    setSaveState(null);
    setStage('report');
  };

  let content;
  if (configError) {
    content = (
      <div className="card error-card" role="alert">
        <h2>Can’t reach the server</h2>
        <p>{configError}</p>
        <p className="muted">
          Start the backend with <code>npm run dev</code> from the project folder, then retry.
        </p>
        <button type="button" className="btn primary" onClick={loadConfig}>
          Retry
        </button>
      </div>
    );
  } else if (!config) {
    content = (
      <div className="loading" role="status">
        <span className="spinner" aria-hidden="true" />
        Connecting…
      </div>
    );
  } else if (stage === 'setup') {
    content = <SetupForm options={config} dbEnabled={config.dbEnabled} onStart={startInterview} />;
  } else if (stage === 'interview' && setup) {
    content = (
      <InterviewScreen
        setup={setup}
        limits={config.limits}
        onFinish={finishInterview}
        onExit={goNew}
      />
    );
  } else if (stage === 'report' && report) {
    content = (
      <Report
        session={report}
        saveState={saveState}
        onNew={goNew}
        onBack={reportFrom === 'history' ? () => setStage('history') : null}
        backLabel="Back to history"
      />
    );
  } else if (stage === 'history') {
    content = <History store={store} onOpen={openSaved} />;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header stage={stage} onNew={headerNew} onHistory={headerHistory} />
      {config?.demoMode && (
        <div className="demo-banner" role="note">
          Demo mode: questions come from a built-in list and feedback is rule-based, not from an AI
          model. Add an Ollama API key on the server for the real thing.
        </div>
      )}
      <main id="main" className="shell">
        {content}
      </main>
      <footer className="site-footer">
        AI feedback can be wrong or inconsistent. Use it as a practice aid, not a verdict.
      </footer>
    </div>
  );
}
