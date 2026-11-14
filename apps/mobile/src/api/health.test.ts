import type { HealthResponse } from '@compound/contracts';
import { ZodError } from 'zod';

import { fetchHealth, type FetchHealthOptions } from './health.ts';

/** Any status string, so a test can send a body the contract rejects. */
type ServerBody = { status: string; checks: HealthResponse['checks'] };

function fakeServer(body: ServerBody) {
  const requested: string[] = [];

  const fetch: FetchHealthOptions['fetch'] = async (input) => {
    requested.push(String(input));

    return Response.json(body);
  };

  return { fetch, requested };
}

const healthy = {
  status: 'ok',
  checks: { postgres: 'up', valkey: 'up', queue: 'up' },
} satisfies HealthResponse;

describe('fetchHealth', () => {
  it('asks the server for /health and returns the parsed body', async () => {
    const server = fakeServer(healthy);

    const result = await fetchHealth({ baseUrl: 'http://localhost:3000/', fetch: server.fetch });

    expect(server.requested).toEqual(['http://localhost:3000/health']);
    expect(result).toEqual(healthy);
  });

  it('rejects a body that breaks the contract with a ZodError', async () => {
    const server = fakeServer({ ...healthy, status: 'down' });

    await expect(fetchHealth({ baseUrl: 'http://localhost:3000', fetch: server.fetch })).rejects.toThrow(ZodError);
  });
});
