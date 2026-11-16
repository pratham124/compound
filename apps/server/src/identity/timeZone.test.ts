import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TimeZone } from '@compound/contracts';

import { startIdentity } from './testkit.ts';

// Lives with the server tests, not beside packages/contracts' identity.ts: contracts has no
// test runner, and this needs Postgres.
test('every platform time zone is accepted, is one Postgres knows, and parsing it again changes nothing', async (t) => {
  const { connections } = await startIdentity(t);
  const known = await connections.pool.query<{ name: string }>('select name from pg_timezone_names');
  const postgresNames = new Set(known.rows.map(({ name }) => name));

  const platform = Intl.supportedValuesOf('timeZone');
  const rejected = platform.filter((name) => !TimeZone.safeParse(name).success);

  const accepted = platform.flatMap((name) => {
    const parsed = TimeZone.safeParse(name);

    return parsed.success ? [parsed.data] : [];
  });

  assert.deepEqual(rejected, []);

  for (const name of accepted) {
    assert.ok(postgresNames.has(name), `${name} is not in pg_timezone_names`);
    assert.equal(TimeZone.parse(name), name);
  }
});
