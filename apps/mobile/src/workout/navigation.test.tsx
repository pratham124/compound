import { UserId } from '@compound/contracts';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import RootLayout from '../../app/_layout.tsx';
import TabsLayout from '../../app/(tabs)/_layout.tsx';
import Train from '../../app/(tabs)/train.tsx';
import Today from '../../app/(tabs)/index.tsx';
import AddExercise from '../../app/train/add-exercise.tsx';
import Finished from '../../app/train/workout-finished.tsx';
import ExerciseInfo from '../../app/exercises/[id].tsx';
import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { WorkoutStoreContext } from './WorkoutStoreContext.ts';
import { createWorkoutStore } from './workoutStore.ts';
import { openTestDatabase } from './workoutTestDatabase.ts';

it('returns from exercise info to the checked and partially typed workout, then finishes with chat hidden until Done', async () => {
  const { db, native } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const person = UserId.parse('00000000-0000-4000-8000-000000000001');
    const store = createWorkoutStore(db, person);

    const client: ShellAuthClient = {
      useSession: () => ({ data: { user: { id: person, name: 'Test person', email: 'person@example.test' } }, isPending: false }),
      getCookie: async () => '', signOut: async () => {},
    };

    const open = async () => store;

    function Wrapper({ children }: { children: ReactNode }) {
      return <AuthClientContext value={client}><WorkoutStoreContext value={open}>{children}</WorkoutStoreContext></AuthClientContext>;
    }

    const app = await renderRouter({ _layout: RootLayout, '(tabs)/_layout': TabsLayout, '(tabs)/index': Today, '(tabs)/train': Train, 'train/add-exercise': AddExercise, 'train/workout-finished': Finished, 'exercises/[id]': ExerciseInfo }, { initialUrl: '/train', wrapper: Wrapper });

    await screen.findByRole('button', { name: 'Ask Compound' });
    await fireEvent.press(screen.getByRole('button', { name: 'Start workout' }));
    await screen.findByRole('button', { name: 'Add exercise' });
    expect(screen.queryByRole('button', { name: 'Ask Compound' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add exercise' }));
    await waitFor(() => expect(screen).toHavePathname('/train/add-exercise'));
    await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'incline dumbbell press');
    await fireEvent.press(screen.getByRole('button', { name: 'Incline Dumbbell Press, Dumbbell' }));
    await waitFor(() => expect(screen).toHavePathname('/train'));
    await fireEvent.changeText(screen.getByLabelText('Set 1 reps'), '8');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
    await screen.findByLabelText('1 of 1 sets done');
    await fireEvent.press(screen.getByRole('button', { name: 'Add set to Incline Dumbbell Press' }));
    await fireEvent.changeText(screen.getByLabelText('Set 2 reps'), '6');
    await fireEvent.changeText(screen.getByLabelText('Set 2 weight in kg'), '12.');
    await fireEvent.press(screen.getByRole('button', { name: 'Incline Dumbbell Press' }));
    await waitFor(() => expect(screen).toHavePathname('/exercises/Incline_Dumbbell_Press'));
    await screen.findByRole('header', { name: 'How to do it' });
    expect(screen.queryByRole('button', { name: 'Ask Compound' })).toBeNull();
    // The test renderer doesn't draw native-stack header buttons, so this leaves the page the way its Done button does.
    await act(() => router.back());
    await waitFor(() => expect(screen).toHavePathname('/train'));
    expect(screen.getByRole('checkbox', { name: 'Set 1 done' })).toBeChecked();
    expect(screen.getByLabelText('Set 1 reps').props.value).toBe('8');
    expect(screen.getByLabelText('Set 2 reps').props.value).toBe('6');
    expect(screen.getByLabelText('Set 2 weight in kg').props.value).toBe('12.');
    expect(screen.getByRole('checkbox', { name: 'Set 2 done' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(screen).toHavePathname('/train/workout-finished'));
    await screen.findByLabelText('Sets done: 1');
    expect(screen.queryByRole('button', { name: 'Ask Compound' })).toBeNull();
    expect(await store.active()).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await screen.findByRole('button', { name: 'Start workout' });
    await screen.findByRole('button', { name: 'Ask Compound' });
    await app.unmount();
  } finally {
    native.close();
  }
});
