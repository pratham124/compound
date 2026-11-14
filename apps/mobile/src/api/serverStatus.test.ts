import type { HealthResponse } from '@compound/contracts';

import { loadServerStatus, type LoadServerStatusOptions } from './serverStatus.ts';

const allUp = {
  status: 'ok',
  checks: { postgres: 'up', valkey: 'up', queue: 'up' },
} satisfies HealthResponse;

const valkeyDown = {
  status: 'degraded',
  checks: { postgres: 'up', valkey: 'down', queue: 'up' },
} satisfies HealthResponse;

function serving(body: { status: string }): LoadServerStatusOptions['fetch'] {
  return async () => Response.json(body, { status: body.status === 'ok' ? 200 : 503 });
}

const refusing: LoadServerStatusOptions['fetch'] = async () => {
  throw new TypeError('Network request failed');
};

const neverAnswering: LoadServerStatusOptions['fetch'] = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('loadServerStatus', () => {
  it('reports ready with the health body when every dependency is up', async () => {
    const status = await loadServerStatus({ baseUrl: 'http://laptop:3000', fetch: serving(allUp), timeoutMs: 1000 });

    expect(status).toEqual({ kind: 'ready', health: allUp });
  });

  it('keeps the per-dependency result when the server answers 503 degraded', async () => {
    const status = await loadServerStatus({ baseUrl: 'http://laptop:3000', fetch: serving(valkeyDown), timeoutMs: 1000 });

    expect(status).toEqual({ kind: 'ready', health: valkeyDown });
  });

  it.each([undefined, ''])('reports not-configured when the base URL is %p', async (baseUrl) => {
    const status = await loadServerStatus({ baseUrl, fetch: serving(allUp), timeoutMs: 1000 });

    expect(status).toEqual({ kind: 'not-configured' });
  });

  it('reports unreachable when the request fails', async () => {
    const status = await loadServerStatus({ baseUrl: 'http://laptop:3000', fetch: refusing, timeoutMs: 1000 });

    expect(status).toEqual({ kind: 'unreachable' });
  });

  it('reports unreachable when the server never answers within the timeout', async () => {
    const status = await loadServerStatus({ baseUrl: 'http://laptop:3000', fetch: neverAnswering, timeoutMs: 20 });

    expect(status).toEqual({ kind: 'unreachable' });
  });

  it('reports invalid when the body breaks the health contract', async () => {
    const status = await loadServerStatus({
      baseUrl: 'http://laptop:3000',
      fetch: serving({ status: 'ok' }),
      timeoutMs: 1000,
    });

    expect(status).toEqual({ kind: 'invalid' });
  });

  it('reports invalid when the server answers with a body that is not JSON', async () => {
    const status = await loadServerStatus({
      baseUrl: 'http://laptop:3000',
      fetch: async () => new Response('<!doctype html><title>Not Found</title>', { status: 404 }),
      timeoutMs: 1000,
    });

    expect(status).toEqual({ kind: 'invalid' });
  });
});
