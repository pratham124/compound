import { useCallback, useEffect, useState } from 'react';

import { loadServerStatus, type ServerStatus } from './serverStatus.ts';

const TIMEOUT_MS = 5000;

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;

    setStatus({ kind: 'loading' });

    void loadServerStatus({
      baseUrl: process.env.EXPO_PUBLIC_API_URL,
      fetch: globalThis.fetch,
      timeoutMs: TIMEOUT_MS,
    }).then((result) => {
      if (current) {
        setStatus(result);
      }
    });

    return () => {
      current = false;
    };
  }, [attempt]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, refresh };
}
