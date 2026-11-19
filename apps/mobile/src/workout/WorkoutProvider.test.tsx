import { UserId } from '@compound/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { AccountWorkouts, WorkoutProvider, useWorkouts } from './WorkoutProvider.tsx';
import { WorkoutStoreContext } from './WorkoutStoreContext.ts';
import { Workout, WorkoutExerciseId, WorkoutSetId } from './workout.ts';
import { createWorkoutStore } from './workoutStore.ts';
import { openTestDatabase } from './workoutTestDatabase.ts';

const person = UserId.parse('00000000-0000-4000-8000-000000000001');

const otherPerson = UserId.parse('00000000-0000-4000-8000-000000000002');

const populatedWorkout = Workout.parse({
  id: '00000000-0000-4000-8000-000000000003', startedAt: 1000, finishedAt: null,
  exercises: [{ id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [
    { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '22.5', unit: 'lb', done: true },
    { id: '00000000-0000-4000-8000-000000000006', reps: '', weight: '12.', unit: 'lb', done: false },
  ] }],
});

function Driver() {
  const workouts = useWorkouts();

  return (
    <View>
      <Text>{workouts.state.kind === 'ready' ? workouts.state.active === null ? 'Idle' : 'Active' : 'Loading'}</Text>
      <Text testID="snapshot">{workouts.state.kind === 'ready' ? JSON.stringify(workouts.state.active) : 'Loading'}</Text>
      <Text>{workouts.error ? 'Save failed' : 'No save error'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Reload" onPress={workouts.reload}><Text>Reload</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit" onPress={() => {
        if (workouts.state.kind === 'ready' && workouts.state.active !== null) {
          workouts.change({ ...workouts.state.active, exercises: workouts.state.active.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => set.done ? set : { ...set, reps: '11' }) })) });
        }
      }}><Text>Edit</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={() => {
        if (workouts.state.kind === 'ready' && workouts.state.active !== null) {
          workouts.change(workouts.state.active);
        }
      }}><Text>Retry</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Finish only" onPress={() => void workouts.finish()}><Text>Finish only</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Start" onPress={() => void workouts.start()}><Text>Start</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit and finish" onPress={() => {
        if (workouts.state.kind !== 'ready' || workouts.state.active === null) {
          return;
        }

        const draft = { ...workouts.state.active, exercises: [{ id: WorkoutExerciseId.parse('00000000-0000-4000-8000-000000000004'), exerciseId: 'Pushups', sets: [{ id: WorkoutSetId.parse('00000000-0000-4000-8000-000000000005'), reps: '8', weight: '', unit: 'kg' as const, done: true }] }] };

        workouts.change(draft);
        workouts.change({ ...draft, exercises: draft.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, reps: '9' })) })) });
        void workouts.finish();
      }}><Text>Edit and finish</Text></Pressable>
    </View>
  );
}

it('serializes rapid edits before finishing and does not show completion until the final write commits', async () => {
  const { db, native } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, person);
    let release = () => {};
    const delayed = new Promise<void>((resolve) => { release = resolve; });
    let writes = 0;

    const open = async () => ({ ...store, save: async (workout: Parameters<typeof store.save>[0]) => {
      writes++;

      if (writes === 2) {
        await delayed;
      }

      await store.save(workout);
    } });

    await render(<WorkoutStoreContext value={open}><AccountWorkouts userId={person}><Driver /></AccountWorkouts></WorkoutStoreContext>);
    await screen.findByText('Idle');
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    await screen.findByText('Active');
    const started = await store.active();

    expect(started).not.toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit and finish' }));
    await waitFor(() => expect(writes).toBe(2));
    expect(screen.getByText('Active')).toBeOnTheScreen();
    release();
    await screen.findByText('Idle');
    expect(await store.active()).toBeNull();

    if (started === null) {
      throw new Error('Start failed');
    }

    expect((await store.byId(started.id))?.exercises[0]?.sets[0]?.reps).toBe('9');
  } finally {
    native.close();
  }
});

it('preserves rejected optimistic edits across in-flight hydration and refocus, retries them, and keeps a rejected finish active', async () => {
  const { db, native } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, person);

    await store.save(populatedWorkout);
    let releaseRead = () => {};
    const delayedRead = new Promise<void>((resolve) => { releaseRead = resolve; });
    let reads = 0;
    let rejectWrites = true;

    const open = async () => ({ ...store,
      active: async () => {
        const snapshot = await store.active();

        reads++;

        if (reads === 2) {
          await delayedRead;
        }

        return snapshot;
      },
      save: async (workout: Workout) => {
        if (rejectWrites) {
          throw new Error('Disk full');
        }

        await store.save(workout);
      },
    });

    await render(<WorkoutStoreContext value={open}><AccountWorkouts userId={person}><Driver /></AccountWorkouts></WorkoutStoreContext>);
    await screen.findByText('Active');
    await fireEvent.press(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(reads).toBe(2));
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByText('Save failed');
    await act(async () => { releaseRead(); });
    expect(screen.getByTestId('snapshot').props.children).toContain('"reps":"11"');
    await fireEvent.press(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(reads).toBe(3));
    expect(screen.getByTestId('snapshot').props.children).toContain('"reps":"11"');
    rejectWrites = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('No save error');
    expect((await store.active())?.exercises[0]?.sets[1]?.reps).toBe('11');
    rejectWrites = true;
    await fireEvent.press(screen.getByRole('button', { name: 'Finish only' }));
    await screen.findByText('Save failed');
    expect(screen.getByText('Active')).toBeOnTheScreen();
    expect((await store.active())?.finishedAt).toBeNull();
  } finally {
    native.close();
  }
});

it('remounts account ownership while the previous account writes and the next account opens', async () => {
  const { db, native } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const first = createWorkoutStore(db, person);
    const second = createWorkoutStore(db, otherPerson);
    const otherWorkout = { ...populatedWorkout, id: Workout.parse({ ...populatedWorkout, id: '00000000-0000-4000-8000-000000000007' }).id, exercises: [] };

    await first.save(populatedWorkout);
    await second.save(otherWorkout);
    let releaseWrite = () => {};
    let releaseOpen = () => {};
    const delayedWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const delayedOpen = new Promise<void>((resolve) => { releaseOpen = resolve; });
    let writing = false;

    const open = async (id: string) => {
      if (id === otherPerson) {
        await delayedOpen;

        return second;
      }

      return { ...first, save: async (workout: Workout) => {
        writing = true;
        await delayedWrite;
        await first.save(workout);
      } };
    };

    function clientFor(id: string): ShellAuthClient {
      return {
        useSession: () => ({ data: { user: { id, name: 'Test person', email: 'person@example.test' } }, isPending: false }),
        getCookie: async () => '', signOut: async () => {},
      };
    }

    const rendered = await render(<AuthClientContext value={clientFor(person)}><WorkoutStoreContext value={open}><WorkoutProvider><Driver /></WorkoutProvider></WorkoutStoreContext></AuthClientContext>);

    await screen.findByText('Active');
    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(writing).toBe(true));
    await rendered.rerender(<AuthClientContext value={clientFor(otherPerson)}><WorkoutStoreContext value={open}><WorkoutProvider><Driver /></WorkoutProvider></WorkoutStoreContext></AuthClientContext>);
    expect(screen.getByTestId('snapshot')).toHaveTextContent('Loading');
    await act(async () => { releaseWrite(); });
    expect(screen.getByTestId('snapshot')).toHaveTextContent('Loading');
    await act(async () => { releaseOpen(); });
    await screen.findByText('Active');
    expect(screen.getByTestId('snapshot')).toHaveTextContent(JSON.stringify(otherWorkout));
    expect((await first.active())?.exercises[0]?.sets[1]?.reps).toBe('11');
    expect(await second.active()).toEqual(otherWorkout);
  } finally {
    native.close();
  }
});

it('does not read the next account cookie after an old preference refresh was waiting on its local store', async () => {
  const { db, native } = openTestDatabase();
  const previousUrl = process.env.EXPO_PUBLIC_API_URL;

  process.env.EXPO_PUBLIC_API_URL = 'http://server.test';
  const network = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ units: 'metric', timeZone: 'America/Vancouver' }));

  try {
    await migrateLocalDatabase(db);
    const first = createWorkoutStore(db, person);
    const second = createWorkoutStore(db, otherPerson);

    await first.saveUnit('lb');
    let releasePreference = () => {};
    const delayedPreference = new Promise<void>((resolve) => { releasePreference = resolve; });
    let waiting = false;
    let account = person;
    const cookies: string[] = [];

    const client: ShellAuthClient = {
      useSession: () => ({ data: { user: { id: account, name: 'Test person', email: 'person@example.test' } }, isPending: false }),
      getCookie: async () => {
        cookies.push(account);

        return `session=${account}`;
      },
      signOut: async () => {},
    };

    const open = async (id: string) => id === otherPerson ? second : { ...first, preference: async () => {
      waiting = true;
      await delayedPreference;

      return first.preference();
    } };

    function app() {
      return <AuthClientContext value={client}><WorkoutStoreContext value={open}><WorkoutProvider><Driver /></WorkoutProvider></WorkoutStoreContext></AuthClientContext>;
    }

    const rendered = await render(app());

    await waitFor(() => expect(waiting).toBe(true));
    account = otherPerson;
    await rendered.rerender(app());
    await waitFor(() => expect(cookies).toEqual([otherPerson]));
    await act(async () => { releasePreference(); });
    expect(cookies).toEqual([otherPerson]);
    expect(await first.unit()).toBe('lb');
  } finally {
    native.close();
    network.mockRestore();
    process.env.EXPO_PUBLIC_API_URL = previousUrl;
  }
});
