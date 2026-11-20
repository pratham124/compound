import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useAuthClient } from '../auth/AuthClientContext.tsx';
import { useSignedInSession } from '../auth/useSignedInSession.ts';
import { fetchProfile } from '../profile/profileApi.ts';
import { refreshWorkoutUnits } from '../profile/refreshWorkoutUnits.ts';
import { useWorkoutStoreFactory } from './WorkoutStoreContext.ts';
import { uuidv7 } from './uuidv7.ts';
import { WorkoutId, type WeightUnit, type Workout, type WorkoutExerciseId } from './workout.ts';
import type { WorkoutStore } from './workoutStore.ts';
import { WorkoutStatusContext } from './workoutStatus.ts';
import { removeWorkoutItem, type WorkoutRemoval } from './workoutRemoval.ts';

type WorkoutState = { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; active: Workout | null; unit: WeightUnit };

type WorkoutActions = {
  state: WorkoutState;
  saving: boolean;
  error: boolean;
  focus: WorkoutExerciseId | null;
  requestFocus: (id: WorkoutExerciseId) => void;
  clearFocus: () => void;
  reload: () => void;
  start: () => Promise<void>;
  change: (workout: Workout) => void;
  remove: (removal: WorkoutRemoval) => void;
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
  const { session } = useSignedInSession();

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
  const [focus, setFocus] = useState<WorkoutExerciseId | null>(null);
  // The workout lives in three places: latestWorkout (newest; actions read it so a fast second edit builds on the first),
  // state.active (what is rendered) and the database (what survives a restart). The version counters track the gap between memory and the database.
  const store = useRef<WorkoutStore | null>(null);
  const latestWorkout = useRef<Workout | null>(null);
  const queue = useRef(Promise.resolve());
  const locked = useRef(false);
  const mounted = useRef(true);
  const version = useRef(0);
  const savedVersion = useRef(0);

  const reload = useCallback(() => {
    async function afterPendingSaves() {
      await queue.current;
      setAttempt((n) => n + 1);
    }

    void afterPendingSaves();
  }, []);

  useEffect(() => {
    mounted.current = true;

    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const startedAt = version.current;
    const allSavedAtStart = savedVersion.current === startedAt && !locked.current;

    // The database copy is only newer than memory if nothing was edited while it was being read.
    function untouchedSinceStart() {
      return allSavedAtStart && version.current === startedAt && savedVersion.current === startedAt && !locked.current;
    }

    async function load(id: string) {
      try {
        const opened = await openStore(id);
        const [active, unit] = await Promise.all([opened.active(), opened.unit()]);

        if (!live) {
          return;
        }

        store.current = opened;

        if (untouchedSinceStart()) {
          latestWorkout.current = active;
        }

        setState({ kind: 'ready', active: latestWorkout.current, unit });
        void refreshUnitFromServer(opened);
      } catch {
        if (live) {
          setState({ kind: 'failed' });
        }
      }
    }

    async function refreshUnitFromServer(opened: WorkoutStore) {
      if (refreshUnits === undefined) {
        return;
      }

      try {
        const freshUnit = await refreshUnits(opened, () => live && mounted.current);

        if (live) {
          setState((previous) => previous.kind === 'ready' ? { ...previous, unit: freshUnit } : previous);
        }
      } catch {
        // Offline or the server is down: the unit saved on the phone stays.
      }
    }

    if (userId === null) {
      setState({ kind: 'ready', active: null, unit: 'kg' });

      return;
    }

    void load(userId);

    return () => { live = false; };
  }, [userId, attempt, openStore, refreshUnits]);

  function persist(workout: Workout) {
    const opened = store.current;

    if (opened === null) {
      return Promise.reject(new Error('Database is not ready'));
    }

    setSaving(true);
    const writingVersion = ++version.current;
    const previous = queue.current;

    async function write(database: WorkoutStore) {
      await previous;
      await database.save(workout);
    }

    async function report(saving: Promise<void>) {
      try {
        await saving;
        savedVersion.current = writingVersion;

        if (mounted.current) {
          setError(false);
        }
      } catch {
        if (mounted.current) {
          setError(true);
        }
      }

      if (mounted.current && version.current === writingVersion) {
        setSaving(false);
      }
    }

    const saving = write(opened);

    queue.current = report(saving);

    return saving;
  }

  const clearFocus = useCallback(() => setFocus(null), []);

  function showActive(active: Workout | null) {
    setState((previous) => previous.kind === 'ready' ? { ...previous, active } : previous);
  }

  async function start() {
    if (locked.current || latestWorkout.current !== null || state.kind !== 'ready' || store.current === null) {
      return;
    }

    locked.current = true;
    const workout: Workout = { id: WorkoutId.parse(uuidv7()), startedAt: Date.now(), finishedAt: null, exercises: [] };

    try {
      await persist(workout);
      latestWorkout.current = workout;
      showActive(workout);
    } catch {
      setError(true);
    } finally {
      locked.current = false;
    }
  }

  function change(workout: Workout) {
    if (locked.current || state.kind !== 'ready' || latestWorkout.current?.id !== workout.id) {
      return;
    }

    latestWorkout.current = workout;
    showActive(workout);
    void persist(workout).catch(() => {});
  }

  function remove(removal: WorkoutRemoval) {
    if (!mounted.current || locked.current || latestWorkout.current === null || state.kind !== 'ready') {
      return;
    }

    const updated = removeWorkoutItem(latestWorkout.current, removal);

    if (updated !== null) {
      change(updated);
    }
  }

  async function finish() {
    if (locked.current || latestWorkout.current === null || state.kind !== 'ready') {
      return null;
    }

    locked.current = true;
    const workout = { ...latestWorkout.current, finishedAt: Date.now() };

    try {
      await persist(workout);
      latestWorkout.current = null;
      setFocus(null);
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
    <WorkoutContext value={{ state, saving, error, focus, requestFocus: setFocus, clearFocus, reload, start, change, remove, finish, find }}>
      <WorkoutStatusContext value={state.kind === 'loading' || (state.kind === 'ready' && state.active !== null) ? { kind: 'in-progress' } : { kind: 'idle' }}>
        {children}
      </WorkoutStatusContext>
    </WorkoutContext>
  );
}
