import Constants from 'expo-constants';

import { createAppAuthClient, type SessionStorage } from './createAuthClient.ts';

function memoryStorage(): SessionStorage & { entries: Map<string, string> } {
  const entries = new Map<string, string>();

  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    getItemAsync: async (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    setItemAsync: async (key, value) => {
      entries.set(key, value);
    },
  };
}

describe('the phone auth client', () => {
  beforeAll(() => {
    // Jest has no app.json, and the client builds its origin from the app's URL scheme.
    Object.assign(Constants.expoConfig ?? {}, { scheme: 'compound', hostUri: 'localhost:8081' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the session cookie the server sets in the given storage and sends it on later requests', async () => {
    const storage = memoryStorage();
    const seenCookies: (string | null)[] = [];

    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const request = new Request(input, init);

      seenCookies.push(request.headers.get('cookie'));

      if (!request.url.endsWith('/sign-in/email-otp')) {
        return Response.json({ ok: true });
      }

      const cookie = 'better-auth.session_token=opaque-token.sig; Path=/; HttpOnly; Max-Age=604800';

      return Response.json({ token: 'opaque-token', user: { id: 'u1' } }, { headers: { 'set-cookie': cookie } });
    });

    const client = createAppAuthClient({ baseUrl: 'http://server.test', storage });

    await client.signIn.emailOtp({ email: 'a@b.co', otp: '123456' });

    expect([...storage.entries.values()].join(' ')).toContain('opaque-token.sig');

    await client.emailOtp.sendVerificationOtp({ email: 'a@b.co', type: 'sign-in' });

    expect(seenCookies.at(-1)).toContain('better-auth.session_token=opaque-token.sig');
  });
});
