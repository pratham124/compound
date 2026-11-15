import type { ServerAnswer } from './serverAnswer.ts';

export type SignOutOutcome = { kind: 'signed-out' } | { kind: 'failed' };

export type SignOutDeps = {
  endSessionOnServer: () => Promise<ServerAnswer>;
  clearLocalSession: () => Promise<void>;
};

/**
 * The auth client wipes the stored token before its own sign-out request leaves the phone, so an offline sign-out
 * through it would forget the token and leave the session alive on the server. The server is asked first here.
 */
export async function signOut({ endSessionOnServer, clearLocalSession }: SignOutDeps): Promise<SignOutOutcome> {
  try {
    if ((await endSessionOnServer()).status !== 'ok') {
      return { kind: 'failed' };
    }

    await clearLocalSession();

    return { kind: 'signed-out' };
  } catch {
    return { kind: 'failed' };
  }
}
