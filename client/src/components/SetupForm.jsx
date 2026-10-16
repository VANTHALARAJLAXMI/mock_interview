import usePersistentState from '../hooks/usePersistentState.js';

const COUNTS = [1, 3, 5, 7, 10];

function Segmented({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="seg">
        {options.map((option) => (
          <label key={option} className={option === value ? 'on' : ''}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === value}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SetupForm({ options, dbEnabled, onStart }) {
  const [stored, setStored] = usePersistentState('mia.setup', {});
  const saved = stored && typeof stored === 'object' ? stored : {};
  const pick = (value, list, fallback = list[0]) => (list.includes(value) ? value : fallback);

  const role = pick(saved.role, options.roles);
  const interviewType = pick(saved.interviewType, options.interviewTypes);
  const difficulty = pick(saved.difficulty, options.difficulties, options.difficulties[1] || options.difficulties[0]);
  const questionCount = pick(saved.questionCount, COUNTS, 5);
  const topic = typeof saved.topic === 'string' ? saved.topic : '';
  const save = saved.save !== false;

  const update = (patch) => setStored({ ...saved, ...patch });

  const submit = (event) => {
    event.preventDefault();
    onStart({ role, interviewType, difficulty, topic: topic.trim(), questionCount, save });
  };

  return (
    <div className="setup">
      <div className="hero">
        <h1>Rehearse the interview before it counts.</h1>
        <p>
          Choose a role, answer each question out loud or in writing, and get specific feedback you
          can act on before the next one.
        </p>
      </div>

      <form className="card setup-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="role">Job role</label>
          <select id="role" value={role} onChange={(e) => update({ role: e.target.value })}>
            {options.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <Segmented
          legend="Interview type"
          name="interviewType"
          options={options.interviewTypes}
          value={interviewType}
          onChange={(v) => update({ interviewType: v })}
        />

        <Segmented
          legend="Difficulty"
          name="difficulty"
          options={options.difficulties}
          value={difficulty}
          onChange={(v) => update({ difficulty: v })}
        />

        <div className="field-row">
          <div className="field grow">
            <label htmlFor="topic">
              Topic focus <span className="optional">(optional)</span>
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              maxLength={options.limits.topic}
              placeholder="e.g. React hooks, SQL joins, conflict resolution"
              onChange={(e) => update({ topic: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="count">Questions</label>
            <select
              id="count"
              value={questionCount}
              onChange={(e) => update({ questionCount: Number(e.target.value) })}
            >
              {COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={save} onChange={(e) => update({ save: e.target.checked })} />
          <span>
            Save this session to my history
            <small>
              {dbEnabled
                ? 'Stored in the server database under an anonymous ID tied to this browser. You can delete it any time from History.'
                : 'Stored only in this browser. You can delete it any time from History.'}
            </small>
          </span>
        </label>

        <button type="submit" className="btn primary large">
          Start interview
        </button>
      </form>
    </div>
  );
}
