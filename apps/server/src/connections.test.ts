import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseConfig, type Config } from './config.ts';
import { connect } from './connections.ts';

/** These run against the Compose stack: `pnpm stack:up` first (CI does the same). */
const config = parseConfig(process.env);

function withConnections(t: test.TestContext, settings: Config) {
  const connections = connect(settings);

  t.after(() => connections.close());

  return connections;
}

test('Valkey check passes when it is the first thing run after connecting', async (t) => {
  const { healthChecks } = withConnections(t, config);

  await healthChecks.valkey();
});

test('Postgres and queue checks pass against the running stack', async (t) => {
  const { healthChecks } = withConnections(t, config);

  await healthChecks.postgres();
  await healthChecks.queue();
});

test('Postgres check rejects when nothing listens on the database port', async (t) => {
  const { healthChecks } = withConnections(t, { ...config, databaseUrl: 'postgres://x:y@127.0.0.1:1/z' });

  await assert.rejects(healthChecks.postgres());
});

test('Valkey check rejects when nothing listens on the Valkey port', async (t) => {
  const { healthChecks } = withConnections(t, { ...config, valkeyUrl: 'redis://127.0.0.1:1' });

  await assert.rejects(healthChecks.valkey());
});

test('queue check rejects when the queue endpoint is unreachable', async (t) => {
  const { healthChecks } = withConnections(t, { ...config, sqsEndpoint: 'http://127.0.0.1:1' });

  await assert.rejects(healthChecks.queue());
});

test('queue check rejects when the ticks queue does not exist', async (t) => {
  const { healthChecks } = withConnections(t, { ...config, ticksQueueName: 'no-such-queue' });

  await assert.rejects(healthChecks.queue());
});

test('the api pool has Postgres cancel a slow statement before the client gives up on it', async (t) => {
  const { apiPool } = withConnections(t, config);

  const shown = await apiPool.query<{ statement_timeout: string }>('show statement_timeout');
  const serverLimitMs = Number.parseInt(shown.rows[0]?.statement_timeout ?? '', 10);

  assert.ok(serverLimitMs > 0, 'statement_timeout is set');
  assert.ok(serverLimitMs < (apiPool.options.query_timeout ?? 0), 'Postgres gives up first');
});

test('connect gives the owner and auth pools a fixed few connections and the api pool the rest of the budget', (t) => {
  const { pool, authPool, apiPool } = withConnections(t, { ...config, databasePoolMax: 14 });

  assert.deepEqual([pool.options.max, authPool.options.max, apiPool.options.max], [2, 3, 9]);
});
