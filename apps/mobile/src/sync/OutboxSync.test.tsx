import { SyncBatch, UserId } from '@compound/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NetworkState } from 'expo-network';
import { Pressable, Text } from 'react-native';
import { z } from 'zod';

import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { Workout } from '../workout/workout.ts';
import { AccountWorkouts, useWorkouts } from '../workout/WorkoutProvider.tsx';
import { WorkoutStoreContext } from '../workout/WorkoutStoreContext.ts';
import { createWorkoutStore } from '../workout/workoutStore.ts';
import { workoutSyncKind } from '../workout/workoutSyncKind.ts';
import { openTestDatabase } from '../workout/workoutTestDatabase.ts';
import { OutboxSync, OutboxSyncDeviceContext, whenConnected, type OutboxSyncDevice } from './OutboxSync.tsx';

const ada = UserId.parse('01930000-0000-7000-8000-00000000000a');
const grace = UserId.parse('01930000-0000-7000-8000-00000000000b');

const kinds = [workoutSyncKind];

const finished = Workout.parse({ id: '01930000-0000-7000-8000-000000000001', startedAt: 0, finishedAt: 60_000, exercises: [] });

function clientFor(id: string, getCookie: () => Promise<string>): ShellAuthClient {
  return {
    useSession: () => ({ data: { user: { id, name: 'Test person', email: 'person@example.test' } }, isPending: false }),
    getCookie,
    signOut: async () => {},
  };
}

/** A server that answers every change applied, and remembers which cookie sent which items. */
function fakeServer() {
  const sent: { cookie: string; itemIds: string[] }[] = [];

  const fetch: typeof globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    const { changes } = SyncBatch.parse(JSON.parse(z.string().parse(init?.body)));

    sent.push({ cookie: headers.get('cookie') ?? '', itemIds: changes.map((change) => change.itemId) });

    return new Response(JSON.stringify({ results: changes.map((change) => ({ key: change.key, outcome: 'applied' })) }));
  };

  return { sent, fetch };
}

function pause(ms: number) {
  return new Promise<void>((resolve) => { setTimeout(() => resolve(), ms); });
}

async function migratedDatabase() {
  const opened = openTestDatabase();

  await migrateLocalDatabase(opened.db);

  return opened;
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
});

it("switching account while the upload reads the cookie never sends the first person's workout under the second person's cookie", async () => {
  const { native, db } = await migratedDatabase();
  const openDb = async () => db;
  const server = fakeServer();
  let releaseCookie: (cookie: string) => void = () => {};
  const cookie = new Promise<string>((resolve) => { releaseCookie = resolve; });
  let cookieAsked = false;

  const askCookie = async () => {
    cookieAsked = true;

    return cookie;
  };

  const testDevice: OutboxSyncDevice = { appVersion: '1.0.0', wakeUps: [], fetch: server.fetch };

  try {
    await createWorkoutStore(db, ada).save(finished);

    const rendered = await render(<OutboxSyncDeviceContext value={testDevice}><AuthClientContext value={clientFor(ada, askCookie)}><OutboxSync kinds={kinds} openDatabase={openDb}><Text>App</Text></OutboxSync></AuthClientContext></OutboxSyncDeviceContext>);

    await waitFor(() => expect(cookieAsked).toBe(true));
    await rendered.rerender(<OutboxSyncDeviceContext value={testDevice}><AuthClientContext value={clientFor(grace, askCookie)}><OutboxSync kinds={kinds} openDatabase={openDb}><Text>App</Text></OutboxSync></AuthClientContext></OutboxSyncDeviceContext>);
    await act(async () => { releaseCookie('grace-session'); });

    await waitFor(() => expect(server.sent.flatMap(({ itemIds }) => itemIds)).not.toContain(finished.id));
    expect(native.prepare('SELECT user_id, item_id FROM sync_outbox').all()).toEqual([{ user_id: ada, item_id: finished.id }]);
  } finally {
    native.close();
  }
});

function Finisher() {
  const workouts = useWorkouts();

  return (
    <>
      <Text>{workouts.state.kind === 'ready' ? workouts.state.active === null ? 'Idle' : 'Active' : 'Loading'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Start" onPress={() => void workouts.start()}><Text>Start</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Finish" onPress={() => void workouts.finish()}><Text>Finish</Text></Pressable>
    </>
  );
}

it('finishing a workout while online uploads it straight away, with no other wake-up', async () => {
  const { native, db } = await migratedDatabase();
  const openDb = async () => db;
  const server = fakeServer();
  const testDevice: OutboxSyncDevice = { appVersion: '1.0.0', wakeUps: [], fetch: server.fetch };
  const open = async (id: string) => createWorkoutStore(db, UserId.parse(id));

  try {
    await render(
      <OutboxSyncDeviceContext value={testDevice}>
        <AuthClientContext value={clientFor(ada, async () => 'ada-session')}>
          <OutboxSync kinds={kinds} openDatabase={openDb}>
            <WorkoutStoreContext value={open}><AccountWorkouts userId={ada}><Finisher /></AccountWorkouts></WorkoutStoreContext>
          </OutboxSync>
        </AuthClientContext>
      </OutboxSyncDeviceContext>,
    );

    await screen.findByText('Idle');
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    await screen.findByText('Active');
    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    await screen.findByText('Idle');

    await waitFor(() => expect(server.sent).toEqual([{ cookie: 'ada-session', itemIds: [expect.any(String)] }]));
    await waitFor(() => expect(native.prepare('SELECT key FROM sync_outbox').all()).toEqual([]));
  } finally {
    native.close();
  }
});

/** A stand-in for expo-network's listener that the test can report connection changes through. */
function fakeNetwork() {
  const listeners = new Set<(state: NetworkState) => void>();

  return {
    addListener: (listener: (state: NetworkState) => void) => {
      listeners.add(listener);

      return { remove: () => { listeners.delete(listener); } };
    },
    listening: () => listeners.size,
    report: (state: NetworkState) => {
      for (const listener of listeners) {
        listener(state);
      }
    },
  };
}

it('the phone reporting it is connected again starts an upload; a report that it is still offline does not', async () => {
  const { native, db } = await migratedDatabase();
  const openDb = async () => db;
  const server = fakeServer();
  const network = fakeNetwork();
  let online = false;
  let attempts = 0;

  const fetch: typeof globalThis.fetch = async (input, init) => {
    attempts += 1;

    if (!online) {
      throw new TypeError('Network request failed');
    }

    return server.fetch(input, init);
  };

  const testDevice: OutboxSyncDevice = { appVersion: '1.0.0', wakeUps: [whenConnected(network.addListener)], fetch };

  try {
    await createWorkoutStore(db, ada).save(finished);
    await render(<OutboxSyncDeviceContext value={testDevice}><AuthClientContext value={clientFor(ada, async () => 'ada-session')}><OutboxSync kinds={kinds} openDatabase={openDb}><Text>App</Text></OutboxSync></AuthClientContext></OutboxSyncDeviceContext>);
    await waitFor(() => expect(attempts).toBe(1));

    await act(async () => { network.report({ isConnected: false, isInternetReachable: false }); });
    await act(async () => { await pause(50); });
    online = true;
    await act(async () => { network.report({ isConnected: true, isInternetReachable: true }); });

    await waitFor(() => expect(native.prepare('SELECT key FROM sync_outbox').all()).toEqual([]));
    expect(attempts).toBe(2);
    expect(server.sent).toEqual([{ cookie: 'ada-session', itemIds: [finished.id] }]);
  } finally {
    native.close();
  }
});

it("after sign-out a wake-up uploads nothing, even with the signed-out person's workout still queued", async () => {
  const { native, db } = await migratedDatabase();
  const openDb = async () => db;
  const server = fakeServer();
  const network = fakeNetwork();
  let cookieReads = 0;
  const testDevice: OutboxSyncDevice = { appVersion: '1.0.0', wakeUps: [whenConnected(network.addListener)], fetch: server.fetch };

  const signedOut: ShellAuthClient = { useSession: () => ({ data: null, isPending: false }), getCookie: async () => '', signOut: async () => {} };
  const ui = (client: ShellAuthClient) => <OutboxSyncDeviceContext value={testDevice}><AuthClientContext value={client}><OutboxSync kinds={kinds} openDatabase={openDb}><Text>App</Text></OutboxSync></AuthClientContext></OutboxSyncDeviceContext>;

  try {
    const readCookie = async () => {
      cookieReads += 1;

      return 'ada-session';
    };

    const rendered = await render(ui(clientFor(ada, readCookie)));

    await waitFor(() => expect(network.listening()).toBe(1));
    await act(async () => { await pause(50); });
    await rendered.rerender(ui(signedOut));
    await createWorkoutStore(db, ada).save(finished);

    await act(async () => { network.report({ isConnected: true, isInternetReachable: true }); });
    await act(async () => { await pause(50); });

    expect(cookieReads).toBe(0);
    expect(server.sent).toEqual([]);
    expect(native.prepare('SELECT item_id FROM sync_outbox').all()).toEqual([{ item_id: finished.id }]);
  } finally {
    native.close();
  }
});

it('a workout finished after the phone clock was moved back before its start still uploads instead of being rejected', async () => {
  const { native, db } = await migratedDatabase();
  const openDb = async () => db;
  const server = fakeServer();
  const testDevice: OutboxSyncDevice = { appVersion: '1.0.0', wakeUps: [], fetch: server.fetch };
  const open = async (id: string) => createWorkoutStore(db, UserId.parse(id));
  const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 20, 18));

  try {
    await render(
      <OutboxSyncDeviceContext value={testDevice}>
        <AuthClientContext value={clientFor(ada, async () => 'ada-session')}>
          <OutboxSync kinds={kinds} openDatabase={openDb}>
            <WorkoutStoreContext value={open}><AccountWorkouts userId={ada}><Finisher /></AccountWorkouts></WorkoutStoreContext>
          </OutboxSync>
        </AuthClientContext>
      </OutboxSyncDeviceContext>,
    );

    await screen.findByText('Idle');
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    await screen.findByText('Active');
    clock.mockReturnValue(Date.UTC(2026, 10, 20, 17));
    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    await screen.findByText('Idle');

    await waitFor(() => expect(server.sent).toEqual([{ cookie: 'ada-session', itemIds: [expect.any(String)] }]));
    await waitFor(() => expect(native.prepare('SELECT key FROM sync_outbox').all()).toEqual([]));
  } finally {
    clock.mockRestore();
    native.close();
  }
});

it('a database that fails to open is reported, not swallowed, and the report names neither person nor id', async () => {
  const failure = new Error('disk I/O error');
  const reported = jest.spyOn(console, 'error').mockImplementation(() => {});
  const testDevice: OutboxSyncDevice = { appVersion: '1.0.0', wakeUps: [], fetch: fakeServer().fetch };
  const failingOpen = async () => { throw failure; };

  try {
    await render(<OutboxSyncDeviceContext value={testDevice}><AuthClientContext value={clientFor(ada, async () => 'ada-session')}><OutboxSync kinds={kinds} openDatabase={failingOpen}><Text>App</Text></OutboxSync></AuthClientContext></OutboxSyncDeviceContext>);

    await waitFor(() => expect(reported).toHaveBeenCalledWith(expect.stringContaining('Outbox sync could not start'), failure));
    expect(JSON.stringify(reported.mock.calls.map(([message]) => message))).not.toContain(ada);
  } finally {
    reported.mockRestore();
  }
});
