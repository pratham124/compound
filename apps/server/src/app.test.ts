import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildApp } from './app.ts';
import type { HealthChecks } from './health.ts';

const reachable = async () => {};

const unreachable = async () => {
  throw new Error('connection refused');
};

function appWith(checks: HealthChecks) {
  return buildApp({ logger: false, healthChecks: checks });
}

test('GET /health returns 200 when Postgres, Valkey and the queue are reachable', async (t) => {
  const app = appWith({ postgres: reachable, valkey: reachable, queue: reachable });

  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'ok',
    checks: { postgres: 'up', valkey: 'up', queue: 'up' },
  });
});

test('GET /health returns 503 and names only the unreachable dependency', async (t) => {
  const app = appWith({ postgres: reachable, valkey: unreachable, queue: reachable });

  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    status: 'degraded',
    checks: { postgres: 'up', valkey: 'down', queue: 'up' },
  });
});
