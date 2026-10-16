export default function Header({ stage, onNew, onHistory }) {
  const inHistory = stage === 'history';
  return (
    <header className="site-header">
      <button type="button" className="brand" onClick={onNew} aria-label="Mock Interview Assistant — home">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="brand-name">Mock Interview Assistant</span>
      </button>
      <nav aria-label="Main">
        <button
          type="button"
          className={`nav-btn${!inHistory ? ' active' : ''}`}
          aria-current={!inHistory ? 'page' : undefined}
          onClick={onNew}
        >
          New interview
        </button>
        <button
          type="button"
          className={`nav-btn${inHistory ? ' active' : ''}`}
          aria-current={inHistory ? 'page' : undefined}
          onClick={onHistory}
        >
          History
        </button>
      </nav>
    </header>
  );
}
