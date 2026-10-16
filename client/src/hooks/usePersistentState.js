import { useEffect, useState } from 'react';

/** useState that survives reloads. Fails soft if storage is blocked. */
export default function usePersistentState(key, initial, storage = 'localStorage') {
  const [value, setValue] = useState(() => {
    try {
      const raw = window[storage].getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window[storage].setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [key, value, storage]);

  return [value, setValue];
}
