import { UserId } from '@compound/contracts';
import { renderRouter, screen } from 'expo-router/testing-library';
import Constants from 'expo-constants';
import type { ReactNode } from 'react';

import RootLayout from '../../app/_layout.tsx';
import TabsLayout from '../../app/(tabs)/_layout.tsx';
import Train from '../../app/(tabs)/train.tsx';
import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { createAppAuthClient, type SessionStorage } from '../auth/createAuthClient.ts';
import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { WorkoutStoreContext } from './WorkoutStoreContext.ts';
import { Workout } from './workout.ts';
import { createWorkoutStore } from './workoutStore.ts';
import { temporaryWorkoutDatabase } from './workoutTestDatabase.ts';

it('cold-starts with the actual cached SDK session offline and restores a populated workout from a reopened disk database', async () => {
  Object.assign(Constants.expoConfig ?? {}, { scheme: 'compound', hostUri: 'localhost:8081' });
  const entries = new Map<string, string>();

  const storage: SessionStorage = {
    getItem: (key) => entries.get(key) ?? null,
    getItemAsync: async (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    setItemAsync: async (key, value) => { entries.set(key, value); },
  };

  const person = UserId.parse('00000000-0000-4000-8000-000000000001');
  const now = new Date().toISOString();

  const user = { id: person, name: 'Offline person', email: 'offline@example.test', emailVerified: true, createdAt: now, updatedAt: now };

  const session = { id: '00000000-0000-4000-8000-000000000008', token: 'opaque-token', userId: person, expiresAt: new Date(Date.now() + 86400000).toISOString(), createdAt: now, updatedAt: now };

  const network = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ user, session }, { headers: { 'set-cookie': 'better-auth.session_token=opaque-token.sig; Path=/; HttpOnly; Max-Age=604800' } }));
  const warmClient = createAppAuthClient({ baseUrl: 'http://server.test', storage });

  await warmClient.getSession();
  expect([...entries.values()].join(' ')).toContain(person);
  const disk = temporaryWorkoutDatabase();
  let opened = disk.open();

  try {
    await migrateLocalDatabase(opened.db);
    const store = createWorkoutStore(opened.db, person);

    const workout = Workout.parse({
      id: '00000000-0000-4000-8000-000000000003', startedAt: Date.now() - 120000, finishedAt: null,
      exercises: [{ id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [
        { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '22.5', unit: 'lb', done: true },
        { id: '00000000-0000-4000-8000-000000000006', reps: '', weight: '12.', unit: 'lb', done: false },
      ] }],
    });

    await store.save(workout);
    await store.saveUnit('lb');
    opened.native.close();
    opened = disk.open();
    await migrateLocalDatabase(opened.db);
    network.mockReset().mockRejectedValue(new Error('Airplane mode'));
    const coldClient = createAppAuthClient({ baseUrl: 'http://server.test', storage });

    const shell: ShellAuthClient = {
      useSession: () => coldClient.useSession(),
      getCookie: () => coldClient.getCookie(),
      signOut: async () => { await coldClient.signOut(); },
    };

    const open = async (id: string) => createWorkoutStore(opened.db, UserId.parse(id));

    function Wrapper({ children }: { children: ReactNode }) {
      return <AuthClientContext value={shell}><WorkoutStoreContext value={open}>{children}</WorkoutStoreContext></AuthClientContext>;
    }

    const app = await renderRouter({ _layout: RootLayout, '(tabs)/_layout': TabsLayout, '(tabs)/train': Train }, { initialUrl: '/train', wrapper: Wrapper });

    await screen.findByLabelText('Set 1 reps');
    expect(screen.getByLabelText('Set 1 reps').props.value).toBe('8');
    expect(screen.getByLabelText('Set 1 weight in lb').props.value).toBe('22.5');
    expect(screen.getByLabelText('Set 2 reps').props.value).toBe('');
    expect(screen.getByLabelText('Set 2 weight in lb').props.value).toBe('12.');
    expect(screen.getByRole('checkbox', { name: 'Set 1 done' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Set 2 done' })).not.toBeChecked();
    expect(screen.getByText('Pushups')).toBeOnTheScreen();
    expect(await createWorkoutStore(opened.db, person).active()).toEqual(workout);
    expect(network.mock.calls.some(([input]) => new Request(input).url.endsWith('/get-session'))).toBe(true);
    await app.unmount();
  } finally {
    opened.native.close();
    disk.remove();
    network.mockRestore();
  }
});
