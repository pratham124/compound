import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE_MS = 60_000;

/**
 * The current time, refreshed on each minute boundary and whenever the app comes back to the foreground, so a greeting
 * and date left on screen change on time. iOS pauses JS timers in the background, which is why the foreground refresh
 * is needed: a phone reopened the next morning would otherwise show yesterday until the next tick.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = new Date();

      setNow(current);
      timer = setTimeout(tick, MINUTE_MS - (current.getTime() % MINUTE_MS));
    };

    timer = setTimeout(tick, MINUTE_MS - (Date.now() % MINUTE_MS));

    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
      }
    });

    return () => {
      clearTimeout(timer);
      foreground.remove();
    };
  }, []);

  return now;
}
