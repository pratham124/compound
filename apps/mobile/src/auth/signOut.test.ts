import { signOut } from './signOut.ts';

function localSession() {
  const clear = jest.fn<Promise<void>, []>(async () => {});

  return clear;
}

describe('signOut', () => {
  it('forgets the session on the phone once the server has ended it', async () => {
    const clearLocalSession = localSession();

    const outcome = await signOut({ endSessionOnServer: async () => ({ status: 'ok' }), clearLocalSession });

    expect(outcome).toEqual({ kind: 'signed-out' });
    expect(clearLocalSession).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on the phone, so the person can retry, when the server cannot be reached', async () => {
    const clearLocalSession = localSession();

    const unreachable = async () => {
      throw new TypeError('Network request failed');
    };

    const outcome = await signOut({ endSessionOnServer: unreachable, clearLocalSession });

    expect(outcome).toEqual({ kind: 'failed' });
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it('keeps the session on the phone when the server answers with an error', async () => {
    const clearLocalSession = localSession();

    const outcome = await signOut({ endSessionOnServer: async () => ({ status: 'error' }), clearLocalSession });

    expect(outcome).toEqual({ kind: 'failed' });
    expect(clearLocalSession).not.toHaveBeenCalled();
  });
});
