import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildApp } from './app.ts';

test('GET /health returns 200 and { status: "ok" }', async (t) => {
  const app = buildApp({ logger: false });

  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok' });
});
