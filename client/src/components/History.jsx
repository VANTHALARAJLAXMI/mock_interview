import { useCallback, useEffect, useState } from 'react';
import { averageScore, formatDate } from '../utils/report.js';

export default function History({ store, onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setItems(null);
    try {
      setItems(await store.list());
    } catch (err) {
      setError(err.message);
      setItems([]);
    }
  }, [store]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (session) => {
    if (!window.confirm('Delete this saved session? This can’t be undone.')) return;
    try {
      await store.remove(session.id);
      setItems((prev) => prev.filter((s) => s.id !== session.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="history" aria-labelledby="history-title">
      <h2 id="history-title">History</h2>
      <p className="muted">Sessions are stored in {store.label}.</p>

      {error && (
        <p className="alert error" role="alert">
          {error}{' '}
          <button type="button" className="link" onClick={load}>
            Retry
          </button>
        </p>
      )}

      {items === null && (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Loading your sessions…
        </div>
      )}

      {items && items.length === 0 && !error && (
        <div className="card empty">
          <h3>No saved sessions yet</h3>
          <p>Finish an interview with “Save this session to my history” ticked and it will appear here.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="history-list">
          {items.map((s) => {
            const avg = averageScore(s.answers || []);
            const count = (s.answers || []).length;
            return (
              <li key={s.id} className="card history-item">
                <div>
                  <h3>{s.role}</h3>
                  <p className="muted">
                    {s.interviewType}, {s.difficulty}
                    {s.topic ? `, ${s.topic}` : ''}
                  </p>
                  <p className="muted">
                    {formatDate(s.createdAt)} · {count} {count === 1 ? 'answer' : 'answers'}
                    {avg !== null && ` · average ${avg.toFixed(1)}/10`}
                  </p>
                </div>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => onOpen(s)}>
                    Open report
                  </button>
                  <button type="button" className="btn ghost danger" onClick={() => remove(s)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
