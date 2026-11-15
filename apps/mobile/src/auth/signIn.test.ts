import { appleUser, signInWithApple, signedInLabel, type AppleSignInDeps } from './signIn.ts';

type Exchange = AppleSignInDeps['exchange'];

function deps(overrides: Partial<AppleSignInDeps> = {}): AppleSignInDeps {
  return {
    requestAppleIdentityToken: async () => ({ kind: 'token', token: 'apple-id-token', fullName: null }),
    exchange: async () => ({ ok: true }),
    ...overrides,
  };
}

describe('signInWithApple', () => {
  it('sends the identity token Apple gave the phone to the server and reports signed in', async () => {
    const exchange = jest.fn<ReturnType<Exchange>, Parameters<Exchange>>(async () => ({ ok: true }));

    const outcome = await signInWithApple(deps({ exchange }));

    expect(outcome).toEqual({ kind: 'signed-in' });
    expect(exchange).toHaveBeenCalledWith({ token: 'apple-id-token', fullName: null });
  });

  it('passes on the name Apple sent, which it sends only the first time the person authorizes the app', async () => {
    const exchange = jest.fn<ReturnType<Exchange>, Parameters<Exchange>>(async () => ({ ok: true }));

    const requestAppleIdentityToken = async () =>
      ({ kind: 'token', token: 'apple-id-token', fullName: { givenName: 'Ada', familyName: 'Lovelace' } }) as const;

    await signInWithApple(deps({ exchange, requestAppleIdentityToken }));

    expect(exchange).toHaveBeenCalledWith({
      token: 'apple-id-token',
      fullName: { givenName: 'Ada', familyName: 'Lovelace' },
    });
  });

  it('reports cancelled, without calling the server, when the person dismisses the Apple sheet', async () => {
    const exchange = jest.fn<ReturnType<Exchange>, Parameters<Exchange>>(async () => ({ ok: true }));

    const outcome = await signInWithApple(deps({ requestAppleIdentityToken: async () => ({ kind: 'cancelled' }), exchange }));

    expect(outcome).toEqual({ kind: 'cancelled' });
    expect(exchange).not.toHaveBeenCalled();
  });

  it('reports failed when the server refuses the token', async () => {
    expect(await signInWithApple(deps({ exchange: async () => ({ ok: false }) }))).toEqual({ kind: 'failed' });
  });

  it('reports failed when the Apple sheet or the request to the server throws', async () => {
    const sheetBroke = deps({
      requestAppleIdentityToken: async () => {
        throw new Error('ERR_REQUEST_UNKNOWN');
      },
    });

    const networkDown = deps({
      exchange: async () => {
        throw new TypeError('Network request failed');
      },
    });

    expect(await signInWithApple(sheetBroke)).toEqual({ kind: 'failed' });
    expect(await signInWithApple(networkDown)).toEqual({ kind: 'failed' });
  });

  it('reports failed when Apple gives no identity token', async () => {
    expect(await signInWithApple(deps({ requestAppleIdentityToken: async () => ({ kind: 'missing' }) }))).toEqual({
      kind: 'failed',
    });
  });
});

describe('appleUser', () => {
  it('is the first and last name in the shape the server expects', () => {
    expect(appleUser({ givenName: 'Ada', familyName: 'Lovelace' })).toEqual({
      name: { firstName: 'Ada', lastName: 'Lovelace' },
    });
  });

  it('is nothing when Apple sent no name, as on every sign-in after the first', () => {
    expect(appleUser(null)).toBeUndefined();
    expect(appleUser({ givenName: null, familyName: null })).toBeUndefined();
  });

  it('keeps a name that has only one part', () => {
    expect(appleUser({ givenName: 'Ada', familyName: null })).toEqual({ name: { firstName: 'Ada' } });
  });
});

describe('signedInLabel', () => {
  it('shows the name when there is one', () => {
    expect(signedInLabel({ name: 'Pratham', email: 'p@example.com' })).toEqual({ kind: 'name', name: 'Pratham' });
  });

  it('shows the email when there is no name, as for a first email-code sign-in', () => {
    expect(signedInLabel({ name: '', email: 'p@example.com' })).toEqual({ kind: 'email', email: 'p@example.com' });
    expect(signedInLabel({ name: '   ', email: 'p@example.com' })).toEqual({ kind: 'email', email: 'p@example.com' });
  });

  it('shows no address, only that Apple signed them in, when there is no name and the email is an Apple relay address', () => {
    expect(signedInLabel({ name: '', email: 'x7k2m9q4r1@privaterelay.appleid.com' })).toEqual({ kind: 'apple' });
  });

  it('still prefers a name over a relay address', () => {
    expect(signedInLabel({ name: 'Ada', email: 'x7k2m9q4r1@privaterelay.appleid.com' })).toEqual({
      kind: 'name',
      name: 'Ada',
    });
  });
});
