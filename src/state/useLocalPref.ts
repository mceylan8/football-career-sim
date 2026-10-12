import { useCallback, useState } from 'react';

/** Small per-device UI preference (e.g. "card collapsed"), safe without storage. */
export function useLocalPref(key: string, initial: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(`fcs-ui-${key}`);
      return raw === null ? initial : raw === '1';
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(`fcs-ui-${key}`, next ? '1' : '0');
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [value, set] as const;
}
