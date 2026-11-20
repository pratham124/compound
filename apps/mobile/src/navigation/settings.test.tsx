import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { useState, type ReactNode } from 'react';
import { Text } from 'react-native';

import RootLayout from '../../app/_layout.tsx';
import TabsLayout from '../../app/(tabs)/_layout.tsx';
import Today from '../../app/(tabs)/index.tsx';
import Settings from '../../app/settings.tsx';
import { AuthClientContext, type SessionUser, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { UserId } from '@compound/contracts';
import { WorkoutStoreContext } from '../workout/WorkoutStoreContext.ts';
import { createWorkoutStore } from '../workout/workoutStore.ts';
import { openTestDatabase } from '../workout/workoutTestDatabase.ts';
import { migrateLocalDatabase } from '../localDatabase/migrations.ts';

const person = UserId.parse('00000000-0000-4000-8000-000000000001');

const { db } = openTestDatabase();

const initialized = migrateLocalDatabase(db);

async function openStore() {
  await initialized;

  return createWorkoutStore(db, person);
}

const signedIn: ShellAuthClient = {
  useSession: () => ({ data: { user: { id: person, name: 'Pratham Sitoula', email: 'pratham@example.com' } }, isPending: false }),
  getCookie: async () => 'session=abc',
  signOut: async () => undefined,
};

function SignInStub() {
  return <Text>Sign in</Text>;
}

function SignedIn({ children }: { children: ReactNode }) {
  return <WorkoutStoreContext value={openStore}><AuthClientContext value={signedIn}>{children}</AuthClientContext></WorkoutStoreContext>;
}

describe('Settings screen', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  });

  it('shows the person, then their weight units and time zone once the server answers', async () => {
    const asked: string[] = [];

    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      asked.push(new Request(input).url);

      return Response.json({ timeZone: 'America/Toronto', units: 'imperial' });
    });

    await renderRouter({ settings: Settings }, { initialUrl: '/settings', wrapper: SignedIn });

    expect(screen.getByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.getByText('Pratham Sitoula')).toBeOnTheScreen();
    expect(screen.getByText('pratham@example.com')).toBeOnTheScreen();
    expect(await screen.findByText('America/Toronto')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'lb' })).toBeChecked();
    expect(asked[0]).toContain('/me/profile');
  });

  it('offers a retry when the server cannot be reached', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await renderRouter({ settings: Settings }, { initialUrl: '/settings', wrapper: SignedIn });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});

describe('Signing out from Settings', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  });

  /** A client whose session really goes away when signOut runs, so the app's sign-in gate reacts as it does on a phone. */
  function StatefulSession({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>({ id: person, name: 'Pratham Sitoula', email: 'pratham@example.com' });

    const client: ShellAuthClient = {
      useSession: () => ({ data: user === null ? null : { user }, isPending: false }),
      getCookie: async () => 'session=abc',
      signOut: async () => setUser(null),
    };

    return <AuthClientContext value={client}>{children}</AuthClientContext>;
  }

  it('lands on the sign-in screen once the server has ended the session', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      return new Request(input).url.endsWith('/me/profile')
        ? Response.json({ timeZone: 'America/Toronto', units: 'metric' })
        : Response.json({});
    });

    await renderRouter(
      { _layout: RootLayout, '(tabs)/_layout': TabsLayout, '(tabs)/index': Today, settings: Settings, 'sign-in': SignInStub },
      { initialUrl: '/settings', wrapper: StatefulSession },
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(screen).toHavePathname('/sign-in'));
  });

  it('stays on Settings and explains when the server cannot be reached', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (new Request(input).url.endsWith('/me/profile')) {
        return Response.json({ timeZone: 'America/Toronto', units: 'metric' });
      }

      throw new Error('offline');
    });

    await renderRouter(
      { _layout: RootLayout, '(tabs)/_layout': TabsLayout, '(tabs)/index': Today, settings: Settings, 'sign-in': SignInStub },
      { initialUrl: '/settings', wrapper: StatefulSession },
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Couldn't sign out/);
    expect(screen).toHavePathname('/settings');
  });
});
