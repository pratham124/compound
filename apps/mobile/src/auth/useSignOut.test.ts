import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSignOut } from './useSignOut.ts';

// Expo installs `fetch` as a lazy global, and the first read loads and transforms expo/fetch. That read happens inside
// the first test's `jest.spyOn`, so on a loaded machine with a cold transform cache it ate the whole 5 s test timeout.
void globalThis.fetch;

function client() {
  return { getCookie: async () => 'session=abc', signOut: jest.fn(async () => undefined) };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useSignOut', () => {
  it('ends the session on the server with the cookie, then clears the phone', async () => {
    const requests: { url: string; method: string; cookie: string | null }[] = [];

    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const request = new Request(input, init);

      requests.push({ url: request.url, method: request.method, cookie: request.headers.get('cookie') });

      return Response.json({});
    });

    const authClient = client();
    const { result } = await renderHook(() => useSignOut({ baseUrl: 'http://localhost:3000', authClient }));

    await act(() => result.current.run());

    expect(requests).toEqual([{ url: 'http://localhost:3000/api/auth/sign-out', method: 'POST', cookie: 'session=abc' }]);
    expect(authClient.signOut).toHaveBeenCalledTimes(1);
    expect(result.current.failed).toBe(false);
  });

  it('keeps the phone signed in and reports a failure when the server cannot be reached', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const authClient = client();
    const { result } = await renderHook(() => useSignOut({ baseUrl: 'http://localhost:3000', authClient }));

    await act(() => result.current.run());

    expect(authClient.signOut).not.toHaveBeenCalled();
    expect(result.current.failed).toBe(true);
    expect(result.current.signingOut).toBe(false);
  });

  it('reports that it is signing out until the server has answered', async () => {
    const answer = Promise.withResolvers<Response>();

    jest.spyOn(globalThis, 'fetch').mockReturnValue(answer.promise);

    const { result } = await renderHook(() => useSignOut({ baseUrl: 'http://localhost:3000', authClient: client() }));

    await act(async () => {
      void result.current.run();
    });

    expect(result.current.signingOut).toBe(true);

    await act(async () => answer.resolve(Response.json({})));
    await waitFor(() => expect(result.current.signingOut).toBe(false));
  });

  it('signs out once when tapped twice before the first tap re-renders', async () => {
    const answer = Promise.withResolvers<Response>();
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockReturnValue(answer.promise);

    const { result } = await renderHook(() => useSignOut({ baseUrl: 'http://localhost:3000', authClient: client() }));

    await act(async () => {
      const { run } = result.current;

      void run();
      void run();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => answer.resolve(Response.json({})));
    await waitFor(() => expect(result.current.signingOut).toBe(false));
  });

  it('hides an earlier failure as soon as the person tries again', async () => {
    const retry = Promise.withResolvers<Response>();
    const fetch = jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    fetch.mockReturnValue(retry.promise);

    const { result } = await renderHook(() => useSignOut({ baseUrl: 'http://localhost:3000', authClient: client() }));

    await act(() => result.current.run());

    expect(result.current.failed).toBe(true);

    await act(async () => {
      void result.current.run();
    });

    expect(result.current.failed).toBe(false);
    expect(result.current.signingOut).toBe(true);

    await act(async () => retry.resolve(Response.json({})));
  });
});
