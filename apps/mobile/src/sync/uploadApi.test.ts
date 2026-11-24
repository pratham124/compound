import { SyncChange } from '@compound/contracts';
import { z } from 'zod';

import { uploadChanges, type UploadRequest } from './uploadApi.ts';

const change = SyncChange.parse({ key: '01930000-0000-7000-8000-000000000001', kind: 'workout', itemId: '01930000-0000-7000-8000-000000000002', changedAt: 1, body: {} });

function request(overrides: Partial<UploadRequest>): UploadRequest {
  return {
    baseUrl: 'http://localhost:3000',
    cookie: 'session=abc',
    fetch: async () => new Response(JSON.stringify({ results: [{ key: change.key, outcome: 'applied' }] })),
    timeoutMs: 1000,
    changes: [change],
    signal: new AbortController().signal,
    ...overrides,
  };
}

/** A fetch that never answers, and fails only when its signal aborts, as a hung connection does. */
function hangingFetch(calls: { count: number }): typeof globalThis.fetch {
  return async (_input, init) => {
    calls.count += 1;

    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });
  };
}

it('sends the changes with the cookie and returns the server answer per change', async () => {
  const sent: { url: string; init: RequestInit | undefined }[] = [];

  const result = await uploadChanges(request({
    fetch: async (input, init) => {
      sent.push({ url: z.string().parse(input), init });

      return new Response(JSON.stringify({ results: [{ key: change.key, outcome: 'stale' }] }));
    },
  }));

  expect(result).toEqual({ status: 'uploaded', outcomes: [{ key: change.key, outcome: 'stale' }] });
  expect(sent).toEqual([{ url: 'http://localhost:3000/sync/changes', init: expect.objectContaining({ method: 'POST', body: JSON.stringify({ changes: [change] }), headers: { cookie: 'session=abc', 'content-type': 'application/json' } }) }]);
});

it('reports a 401 as signed out, and throws on any other failure status so the rows stay queued', async () => {
  await expect(uploadChanges(request({ fetch: async () => new Response('{}', { status: 401 }) }))).resolves.toEqual({ status: 'unauthenticated' });
  await expect(uploadChanges(request({ fetch: async () => new Response('{}', { status: 503 }) }))).rejects.toThrow('503');
});

it('refuses to send with no server address', async () => {
  await expect(uploadChanges(request({ baseUrl: '' }))).rejects.toThrow('EXPO_PUBLIC_API_URL');
});

it('sends nothing when it is stopped before it starts, as when the account changes while the cookie is read', async () => {
  const caller = new AbortController();
  const calls = { count: 0 };

  caller.abort();

  await expect(uploadChanges(request({ fetch: hangingFetch(calls), signal: caller.signal }))).rejects.toThrow();
  expect(calls.count).toBe(0);
});

it('aborts and throws when it is stopped mid-request', async () => {
  const caller = new AbortController();
  const calls = { count: 0 };
  const sending = uploadChanges(request({ fetch: hangingFetch(calls), signal: caller.signal, timeoutMs: 60_000 }));

  caller.abort();

  await expect(sending).rejects.toThrow('aborted');
});

it('gives up on a request that never answers after timeoutMs and throws, so the runner can try again', async () => {
  jest.useFakeTimers();

  try {
    const calls = { count: 0 };
    const sending = uploadChanges(request({ fetch: hangingFetch(calls), timeoutMs: 15_000 }));
    const outcome = expect(sending).rejects.toThrow('aborted');

    await jest.advanceTimersByTimeAsync(15_000);
    await outcome;
  } finally {
    jest.useRealTimers();
  }
});
