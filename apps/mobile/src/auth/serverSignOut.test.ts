import { endSessionOnServer } from './serverSignOut.ts';

describe('endSessionOnServer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts to the sign-out route with the stored session cookie and the app origin the server trusts', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true }));

    const answer = await endSessionOnServer({
      baseUrl: 'http://laptop:3000/',
      cookie: 'better-auth.session_token=opaque.sig',
    });

    expect(answer).toEqual({ status: 'ok' });

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(url).toBe('http://laptop:3000/api/auth/sign-out');
    expect(init?.method).toBe('POST');
    expect(headers.get('cookie')).toBe('better-auth.session_token=opaque.sig');
    expect(headers.get('expo-origin')).toBe('compound://');
  });

  it('does not report ok when the server fails', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    expect(await endSessionOnServer({ baseUrl: 'http://laptop:3000', cookie: 'c=1' })).toEqual({ status: 'error' });
  });

  it('throws when there is no server address, so sign-out reports failed', async () => {
    await expect(endSessionOnServer({ baseUrl: undefined, cookie: '' })).rejects.toThrow();
  });
});
