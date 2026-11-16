import { TimeZone } from '@compound/contracts';

import { fetchProfile, saveUnits } from './profileApi.ts';

function fakeServer(reply: () => Response) {
  const requests: { url: string; method: string; cookie: string | null; body: string | null }[] = [];

  const fetch = async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);

    requests.push({
      url: request.url,
      method: request.method,
      cookie: request.headers.get('cookie'),
      body: init?.body === undefined ? null : await request.text(),
    });

    return reply();
  };

  return { fetch, requests };
}

const profile = { timeZone: 'America/Toronto', units: 'imperial' };

describe('fetchProfile', () => {
  it('asks for /me/profile with the session cookie and the phone time zone, and returns the profile', async () => {
    const server = fakeServer(() => Response.json(profile));

    const result = await fetchProfile({
      baseUrl: 'http://localhost:3000',
      cookie: 'session=abc',
      fetch: server.fetch, timeoutMs: 5000,
      timeZone: TimeZone.parse('America/Toronto'),
    });

    expect(server.requests).toEqual([
      { url: 'http://localhost:3000/me/profile?timeZone=America%2FToronto', method: 'GET', cookie: 'session=abc', body: null },
    ]);
    expect(result).toEqual(profile);
  });

  it('leaves the time zone out when the phone has none to give', async () => {
    const server = fakeServer(() => Response.json(profile));

    await fetchProfile({ baseUrl: 'http://localhost:3000', cookie: 'c', fetch: server.fetch, timeoutMs: 5000, timeZone: undefined });

    expect(server.requests[0]?.url).toBe('http://localhost:3000/me/profile');
  });

  it('rejects when the server refuses', async () => {
    const server = fakeServer(() => Response.json({ error: 'unauthenticated' }, { status: 401 }));

    await expect(
      fetchProfile({ baseUrl: 'http://localhost:3000', cookie: 'c', fetch: server.fetch, timeoutMs: 5000, timeZone: undefined }),
    ).rejects.toThrow('401');
  });

  it('rejects an answer that breaks the contract', async () => {
    const server = fakeServer(() => Response.json({ timeZone: 'Mars/Olympus', units: 'metric' }));

    await expect(
      fetchProfile({ baseUrl: 'http://localhost:3000', cookie: 'c', fetch: server.fetch, timeoutMs: 5000, timeZone: undefined }),
    ).rejects.toThrow();
  });

  it('fails when the server address is not configured', async () => {
    const server = fakeServer(() => Response.json(profile));

    await expect(fetchProfile({ baseUrl: undefined, cookie: 'c', fetch: server.fetch, timeoutMs: 5000, timeZone: undefined })).rejects.toThrow(
      'EXPO_PUBLIC_API_URL',
    );
  });
});

describe('timeouts', () => {
  /** Never answers; only an abort ends it, as with a phone that has lost the network. */
  const stalled: typeof globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });

  it('gives up on a profile request the server never answers', async () => {
    await expect(
      fetchProfile({ baseUrl: 'http://localhost:3000', cookie: 'c', fetch: stalled, timeoutMs: 20, timeZone: undefined }),
    ).rejects.toThrow('aborted');
  });

  it('gives up on a units save the server never answers', async () => {
    await expect(saveUnits({ baseUrl: 'http://localhost:3000', cookie: 'c', fetch: stalled, timeoutMs: 20, units: 'metric' })).rejects.toThrow(
      'aborted',
    );
  });
});

describe('saveUnits', () => {
  it('puts the chosen units to /me/profile with the session cookie and returns the saved profile', async () => {
    const server = fakeServer(() => Response.json(profile));

    const result = await saveUnits({ baseUrl: 'http://localhost:3000', cookie: 'session=abc', fetch: server.fetch, timeoutMs: 5000, units: 'imperial' });

    expect(server.requests).toEqual([
      { url: 'http://localhost:3000/me/profile', method: 'PUT', cookie: 'session=abc', body: '{"units":"imperial"}' },
    ]);
    expect(result.units).toBe('imperial');
  });

  it('rejects when the server refuses', async () => {
    const server = fakeServer(() => Response.json({}, { status: 500 }));

    await expect(saveUnits({ baseUrl: 'http://localhost:3000', cookie: 'c', fetch: server.fetch, timeoutMs: 5000, units: 'metric' })).rejects.toThrow(
      '500',
    );
  });
});
