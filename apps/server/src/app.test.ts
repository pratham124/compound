import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildApp } from './app.ts';
import { parseConfig } from './config.ts';
import { connect } from './connections.ts';
import type { HealthChecks } from './health.ts';
import { createAuth } from './identity/auth.ts';
import { createConsoleMailer } from './identity/mailer.ts';

const reachable = async () => {};

const unreachable = async () => {
  throw new Error('connection refused');
};

function appWith(t: test.TestContext, checks: HealthChecks) {
  const config = parseConfig(process.env);
  const connections = connect(config);

  const auth = createAuth({
    pool: connections.authPool,
    valkey: connections.valkey,
    config,
    mailer: createConsoleMailer(() => {}),
  });

  t.after(() => connections.close());

  return buildApp({ logger: false, healthChecks: checks, auth, apiPool: connections.apiPool });
}

test('GET /health returns 200 when Postgres, Valkey and the queue are reachable', async (t) => {
  const app = appWith(t, { postgres: reachable, valkey: reachable, queue: reachable });

  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'ok',
    checks: { postgres: 'up', valkey: 'up', queue: 'up' },
  });
});

test('GET /health returns 503 and names only the unreachable dependency', async (t) => {
  const app = appWith(t, { postgres: reachable, valkey: unreachable, queue: reachable });

  t.after(() => app.close());

  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.json(), {
    status: 'degraded',
    checks: { postgres: 'up', valkey: 'down', queue: 'up' },
  });
});
