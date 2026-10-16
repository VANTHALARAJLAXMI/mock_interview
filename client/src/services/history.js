import * as api from './api.js';
import { makeId, readLocalSessions, writeLocalSessions } from '../utils/storage.js';

/**
 * History lives in MongoDB when the server has it enabled; otherwise in this browser's
 * localStorage. Both stores expose the same small interface.
 */
export function createHistoryStore(dbEnabled) {
  if (dbEnabled) {
    return {
      kind: 'database',
      label: 'the server database',
      list: () => api.listInterviews(),
      save: (session) => api.saveInterview(session),
      remove: (id) => api.deleteInterview(id),
    };
  }
  return {
    kind: 'local',
    label: 'this browser only (local storage)',
    list: async () => readLocalSessions(),
    save: async (session) => {
      const record = { ...session, id: makeId(), createdAt: session.startedAt };
      writeLocalSessions([record, ...readLocalSessions()]);
      return { id: record.id };
    },
    remove: async (id) => {
      writeLocalSessions(readLocalSessions().filter((s) => s.id !== id));
    },
  };
}
