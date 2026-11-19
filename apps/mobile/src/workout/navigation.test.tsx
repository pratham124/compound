import { UserId } from '@compound/contracts';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import RootLayout from '../../app/_layout.tsx';
import TabsLayout from '../../app/(tabs)/_layout.tsx';
import Train from '../../app/(tabs)/train.tsx';
import Today from '../../app/(tabs)/index.tsx';
import AddExercise from '../../app/train/add-exercise.tsx';
import Finished from '../../app/train/workout-finished.tsx';
import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { WorkoutStoreContext } from './WorkoutStoreContext.ts';
import { createWorkoutStore } from './workoutStore.ts';
import { openTestDatabase } from './workoutTestDatabase.ts';

it('routes the real picker back to the logger, saves a bodyweight set and finishes with chat hidden until Done', async () => {
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

    const app = await renderRouter({ _layout: RootLayout, '(tabs)/_layout': TabsLayout, '(tabs)/index': Today, '(tabs)/train': Train, 'train/add-exercise': AddExercise, 'train/workout-finished': Finished }, { initialUrl: '/train', wrapper: Wrapper });

    await screen.findByRole('button', { name: 'Ask Compound' });
    await fireEvent.press(screen.getByRole('button', { name: 'Start empty workout' }));
    await screen.findByRole('button', { name: 'Add exercise' });
    expect(screen.queryByRole('button', { name: 'Ask Compound' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add exercise' }));
    await waitFor(() => expect(screen).toHavePathname('/train/add-exercise'));
    await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'incline dumbbell press');
    await fireEvent.press(screen.getByRole('button', { name: 'Incline Dumbbell Press, Dumbbell' }));
    await waitFor(() => expect(screen).toHavePathname('/train'));
    await fireEvent.changeText(screen.getByLabelText('Set 1 reps'), '8');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
    await screen.findByText('1 of 1 sets done');
    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(screen).toHavePathname('/train/workout-finished'));
    await screen.findByText('Sets done: 1');
    expect(screen.queryByRole('button', { name: 'Ask Compound' })).toBeNull();
    expect(await store.active()).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await screen.findByRole('button', { name: 'Start empty workout' });
    await screen.findByRole('button', { name: 'Ask Compound' });
    await app.unmount();
  } finally {
    native.close();
  }
});
