import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import { parseConfig } from './config.ts';
import { connect } from './connections.ts';
import { migrate } from './identity/migrate.ts';
import { tablesMissingForcedRowLevelSecurity } from './rowLevelSecurity.ts';

async function migratedConnections(t: TestContext) {
  const connections = connect(parseConfig(process.env));

  t.after(() => connections.close());
  await migrate(connections.pool);

  return connections;
}

test('every table with a user_id column has row-level security enabled and forced', async (t) => {
  const connections = await migratedConnections(t);

  assert.deepEqual(await tablesMissingForcedRowLevelSecurity(connections.pool), []);
});

test('the check names a table that has user_id but only enabled, or no, row-level security', async (t) => {
  const connections = await migratedConnections(t);

  // Uncommitted, so tests running in other files never see these tables.
  const client = await connections.pool.connect();

  try {
    await client.query('begin');
    await client.query('create table rls_check_unprotected (user_id uuid)');
    await client.query('create table rls_check_enabled_only (user_id uuid)');
    await client.query('alter table rls_check_enabled_only enable row level security');
    await client.query('create table rls_check_forced (user_id uuid)');
    await client.query('alter table rls_check_forced enable row level security');
    await client.query('alter table rls_check_forced force row level security');
    await client.query('create table rls_check_no_user (id uuid)');

    const missing = await tablesMissingForcedRowLevelSecurity(client);

    assert.deepEqual(
      missing.filter((name) => name.startsWith('rls_check_')),
      ['rls_check_enabled_only', 'rls_check_unprotected'],
    );
  } finally {
    await client.query('rollback');
    client.release();
  }
});
