import type { Profile, Units } from '@compound/contracts';
import { useCallback, useEffect, useState } from 'react';

/** The latest units change: none in flight, one being saved (with the units asked for), or one that failed. */
export type SaveState = { kind: 'idle' } | { kind: 'saving'; units: Units } | { kind: 'failed' };

export type ProfileState =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; profile: Profile; save: SaveState };

export type ProfileActions = {
  load: () => Promise<Profile>;
  save: (units: Units) => Promise<Profile>;
};

export function useProfile({ load, save }: ProfileActions) {
  const [state, setState] = useState<ProfileState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;

    setState({ kind: 'loading' });

    load().then(
      (profile) => current && setState({ kind: 'ready', profile, save: { kind: 'idle' } }),
      () => current && setState({ kind: 'failed' }),
    );

    return () => {
      current = false;
    };
    // The actions are rebuilt every render; only a retry should load again.
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  async function chooseUnits(units: Units) {
    if (state.kind !== 'ready' || state.save.kind === 'saving') {
      return;
    }

    // Choosing what is already stored needs no save, and dismisses an earlier failure.
    if (state.profile.units === units) {
      setState({ ...state, save: { kind: 'idle' } });

      return;
    }

    setState({ ...state, save: { kind: 'saving', units } });

    try {
      const profile = await save(units);

      setState({ kind: 'ready', profile, save: { kind: 'idle' } });
    } catch {
      setState({ ...state, save: { kind: 'failed' } });
    }
  }

  return { state, retry, chooseUnits };
}
