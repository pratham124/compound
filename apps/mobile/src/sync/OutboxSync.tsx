import { UserId } from '@compound/contracts';
import Constants from 'expo-constants';
import { addNetworkStateListener, type NetworkState } from 'expo-network';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuthClient } from '../auth/AuthClientContext.tsx';
import { useSignedInSession } from '../auth/useSignedInSession.ts';
import type { LocalDatabase } from '../localDatabase/migrations.ts';
import type { SyncKind } from './kinds.ts';
import { createSyncRunner, type SyncRunner, type WakeUp } from './syncRunner.ts';
import { uploadChanges } from './uploadApi.ts';

const UPLOAD_TIMEOUT_MS = 15_000;

type NetworkListener = (listener: (state: NetworkState) => void) => { remove: () => void };

export function whenConnected(addListener: NetworkListener): WakeUp {
  return (kick) => {
    const subscription = addListener((state) => {
      if (state.isConnected === true) {
        kick();
      }
    });

    return () => subscription.remove();
  };
}

const whenForeground: WakeUp = (kick) => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      kick();
    }
  });

  return () => subscription.remove();
};

/** What OutboxSync needs from the phone, so tests can give it a fake network and their own wake-ups. */
export type OutboxSyncDevice = {
  appVersion: string;
  wakeUps: readonly WakeUp[];
  fetch: typeof globalThis.fetch;
};

const device: OutboxSyncDevice = {
  appVersion: Constants.expoConfig?.version ?? 'unknown',
  wakeUps: [whenConnected(addNetworkStateListener), whenForeground],
  fetch: (input, init) => globalThis.fetch(input, init),
};

export const OutboxSyncDeviceContext = createContext<OutboxSyncDevice>(device);

function noKick() {}

const SyncKickContext = createContext<() => void>(noKick);

/** Asks the outbox to upload now, for example right after a workout is finished. Does nothing outside OutboxSync. */
export function useSyncKick() {
  return useContext(SyncKickContext);
}

type OutboxSyncProps = {
  /** Every kind the app syncs. Passed in, so the sync module imports no feature; keep it a stable array. */
  kinds: readonly SyncKind[];
  openDatabase: () => Promise<LocalDatabase>;
  children: ReactNode;
};

/** Uploads the signed-in person's outbox whenever the phone is online: at launch, on reconnecting, on returning to the app, and on a kick. */
export function OutboxSync({ kinds, openDatabase, children }: OutboxSyncProps) {
  const authClient = useAuthClient();
  const { appVersion, wakeUps, fetch } = useContext(OutboxSyncDeviceContext);
  const { session } = useSignedInSession();
  const userId = session?.user.id ?? null;
  const signedInAs = useRef(userId);
  const runner = useRef<SyncRunner | null>(null);
  const kick = useCallback(() => runner.current?.kick(), []);

  signedInAs.current = userId;

  useEffect(() => {
    if (userId === null) {
      return;
    }

    let live = true;
    let started: SyncRunner | null = null;

    async function start(signedIn: string) {
      const id = UserId.parse(signedIn);
      const db = await openDatabase();

      if (!live) {
        return;
      }

      started = createSyncRunner({
        db,
        userId: id,
        kinds,
        appVersion,
        wakeUps,
        upload: async (changes, signal) => {
          const cookie = await authClient.getCookie();

          // The cookie is whoever is signed in now; uploading under it after an account switch would file these rows under the new person.
          if (signedInAs.current !== id) {
            throw new Error('The account changed during the upload');
          }

          return uploadChanges({ baseUrl: process.env.EXPO_PUBLIC_API_URL, cookie, fetch, timeoutMs: UPLOAD_TIMEOUT_MS, changes, signal });
        },
      });
      runner.current = started;
      started.kick();
    }

    void start(userId).catch((error) => {
      console.error('Outbox sync could not start, so nothing uploads until the account changes or the app restarts', error);
    });

    return () => {
      live = false;
      started?.stop();

      if (runner.current === started) {
        runner.current = null;
      }
    };
  }, [userId, authClient, openDatabase, kinds, appVersion, wakeUps, fetch]);

  return <SyncKickContext value={kick}>{children}</SyncKickContext>;
}
