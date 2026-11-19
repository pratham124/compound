import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { uuid } from 'expo';

import { useAuthClient } from '../auth/AuthClientContext.tsx';
import { fetchProfile } from '../profile/profileApi.ts';
import { refreshWorkoutUnits } from '../profile/refreshWorkoutUnits.ts';
import { useWorkoutStoreFactory } from './WorkoutStoreContext.ts';
import { WorkoutId, type WeightUnit, type Workout } from './workout.ts';
import type { WorkoutStore } from './workoutStore.ts';
import { WorkoutStatusContext } from './workoutStatus.ts';

type WorkoutState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; active: Workout | null; unit: WeightUnit };

type WorkoutActions = {
  state: WorkoutState;
  saving: boolean;
  error: boolean;
  reload: () => void;
  start: () => Promise<void>;
  change: (workout: Workout) => void;
  finish: () => Promise<WorkoutId | null>;
  find: (id: WorkoutId) => Promise<Workout | null>;
};

const WorkoutContext = createContext<WorkoutActions | null>(null);

export function useWorkouts() {
  const value = useContext(WorkoutContext);

  if (value === null) {
    throw new Error('WorkoutProvider is missing');
  }

  return value;
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const authClient = useAuthClient();
  const { data: session } = authClient.useSession();

  const refreshUnits = useCallback((store: WorkoutStore, isCurrent: () => boolean) => refreshWorkoutUnits(store, async () => {
    if (!isCurrent()) {
      return null;
    }

    const cookie = await authClient.getCookie();

    if (!isCurrent()) {
      return null;
    }

    return fetchProfile({ baseUrl: process.env.EXPO_PUBLIC_API_URL, cookie, fetch: globalThis.fetch, timeoutMs: 5000, timeZone: undefined });
  }, isCurrent), [authClient]);

  return <AccountWorkouts key={session?.user.id ?? 'signed-out'} userId={session?.user.id ?? null} refreshUnits={refreshUnits}>{children}</AccountWorkouts>;
}

export function AccountWorkouts({ children, userId, refreshUnits }: { children: ReactNode; userId: string | null; refreshUnits?: (store: WorkoutStore, isCurrent: () => boolean) => Promise<WeightUnit> }) {
  const openStore = useWorkoutStoreFactory();
  const [state, setState] = useState<WorkoutState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const store = useRef<WorkoutStore | null>(null);
  const current = useRef<Workout | null>(null);
  const queue = useRef(Promise.resolve());
  const locked = useRef(false);
  const mounted = useRef(true);
  const version = useRef(0);
  const savedVersion = useRef(0);

  const reload = useCallback(() => {
    void queue.current.then(() => setAttempt((n) => n + 1));
  }, []);

  useEffect(() => {
    mounted.current = true;

    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const before = version.current;
    const cleanBefore = savedVersion.current === before && !locked.current;

    if (userId === null) {
      setState({ kind: 'ready', active: null, unit: 'kg' });

      return;
    }

    void openStore(userId).then(async (opened) => {
      const [active, unit] = await Promise.all([opened.active(), opened.unit()]);

      if (live) {
        store.current = opened;

        if (cleanBefore && version.current === before && savedVersion.current === before && !locked.current) {
          current.current = active;
        }

        setState({ kind: 'ready', active: current.current, unit });

        if (refreshUnits !== undefined) {
          void refreshUnits(opened, () => live && mounted.current).then((freshUnit) => {
            if (live) {
              setState((previous) => previous.kind === 'ready' ? { ...previous, unit: freshUnit } : previous);
            }
          }).catch(() => {});
        }
      }
    }).catch(() => live && setState({ kind: 'failed' }));

    return () => { live = false; };
  }, [userId, attempt, openStore, refreshUnits]);

  function persist(workout: Workout) {
    const opened = store.current;

    if (opened === null) {
      return Promise.reject(new Error('Database is not ready'));
    }

    setSaving(true);
    const writingVersion = ++version.current;

    const write = queue.current.then(() => opened.save(workout));

    const settled = write.catch(() => {});

    queue.current = settled;
    void write.then(() => {
      savedVersion.current = writingVersion;

      if (mounted.current) {
        setError(false);
      }
    }, () => mounted.current && setError(true));
    void settled.then(() => {
      if (mounted.current && queue.current === settled) {
        setSaving(false);
      }
    });

    return write;
  }

  function showActive(active: Workout | null) {
    setState((previous) => previous.kind === 'ready' ? { ...previous, active } : previous);
  }

  async function start() {
    if (locked.current || current.current !== null || state.kind !== 'ready' || store.current === null) {
      return;
    }

    locked.current = true;
    const workout: Workout = { id: WorkoutId.parse(uuid.v4()), startedAt: Date.now(), finishedAt: null, exercises: [] };

    try {
      await persist(workout);
      current.current = workout;
      showActive(workout);
    } catch {
      setError(true);
    } finally {
      locked.current = false;
    }
  }

  function change(workout: Workout) {
    if (locked.current || state.kind !== 'ready' || current.current?.id !== workout.id) {
      return;
    }

    current.current = workout;
    showActive(workout);
    void persist(workout).catch(() => {});
  }

  async function finish() {
    if (locked.current || current.current === null || state.kind !== 'ready') {
      return null;
    }

    locked.current = true;
    const workout = { ...current.current, finishedAt: Date.now() };

    try {
      await persist(workout);
      current.current = null;
      showActive(null);

      return workout.id;
    } catch {
      setError(true);

      return null;
    } finally {
      locked.current = false;
    }
  }

  async function find(id: WorkoutId) {
    return await store.current?.byId(id) ?? null;
  }

  return (
    <WorkoutContext value={{ state, saving, error, reload, start, change, finish, find }}>
      <WorkoutStatusContext value={state.kind === 'loading' || (state.kind === 'ready' && state.active !== null) ? { kind: 'in-progress' } : { kind: 'idle' }}>
        {children}
      </WorkoutStatusContext>
    </WorkoutContext>
  );
}
