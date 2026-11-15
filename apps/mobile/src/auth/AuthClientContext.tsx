import { createContext, useContext } from 'react';

import { authClient } from './authClient.ts';

export type SessionUser = { name: string; email: string };

/** The part of the auth client the app shell uses, so tests can provide a signed-in stand-in. */
export type ShellAuthClient = {
  useSession: () => { data: { user: SessionUser } | null; isPending: boolean };
  getCookie: () => Promise<string>;
  signOut: () => Promise<void>;
};

const deviceAuthClient: ShellAuthClient = {
  useSession: () => authClient.useSession(),
  getCookie: async () => authClient.getCookie(),
  signOut: async () => {
    await authClient.signOut();
  },
};

export const AuthClientContext = createContext<ShellAuthClient>(deviceAuthClient);

export function useAuthClient(): ShellAuthClient {
  return useContext(AuthClientContext);
}
