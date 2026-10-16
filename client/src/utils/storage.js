const CLIENT_ID_KEY = 'mia.clientId';
const HISTORY_KEY = 'mia.history.v1';
const MAX_LOCAL_SESSIONS = 50;

export function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

/** Random, anonymous per-browser ID used to scope database history. Not a login. */
export function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}

export function readLocalSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalSessions(sessions) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_LOCAL_SESSIONS)));
  } catch {
    throw new Error('Could not save to this browser (storage may be full or blocked).');
  }
}
