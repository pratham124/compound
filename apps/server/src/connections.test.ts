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
