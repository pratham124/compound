import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import { UserId } from '@compound/contracts';
import pg from 'pg';

import { createApiPool } from '../connections.ts';
import { createProfileStore, withUser, type UserQuery } from './profileStore.ts';
import { startIdentity, uniqueEmail } from './testkit.ts';
import { uuidv7 } from './uuidv7.ts';

async function startStore(t: TestContext, options: { max: number }) {
  const identity = await startIdentity(t);
  const pool = createApiPool({ databaseUrl: identity.config.databaseUrl, timeoutMs: 2000, max: options.max });

  t.after(() => pool.end());

  return { pool, store: createProfileStore(pool), owner: identity.connections.pool };
}

async function newPerson(owner: pg.Pool) {
  const id = UserId.parse(uuidv7());

  await owner.query(
    "insert into users (id, name, email, email_verified, created_at, updated_at) values ($1, 'Test person', $2, true, now(), now())",
    [id, uniqueEmail()],
  );

  return id;
}

/** What a connection holds when nothing is running on it: the login role and no person. */
async function idleState(pool: pg.Pool) {
  const result = await pool.query<{ role: string; uid: string | null }>(
    "select current_user as role, current_setting('app.user_id', true) as uid",
  );

  return result.rows[0];
}

async function ownerRole(owner: pg.Pool) {
  const result = await owner.query<{ role: string }>('select current_user as role');

  return result.rows[0]?.role;
}

test('a failed request leaves its pooled connection clean for the next person', async (t) => {
  const { pool, store, owner } = await startStore(t, { max: 1 });
  const ada = await newPerson(owner);
  const grace = await newPerson(owner);

  await store.getOrCreate(ada, undefined);
  await store.getOrCreate(grace, undefined);
  await assert.rejects(withUser(pool, ada, (query) => query('select * from no_such_table')), /no_such_table/);

  const visible = await withUser(pool, grace, (query) => query('select user_id from user_profiles'));

  assert.deepEqual(visible.rows, [{ user_id: grace }]);
});

test('a committed request leaves no role or user id on the pooled connection', async (t) => {
  const { pool, store, owner } = await startStore(t, { max: 1 });
  const ada = await newPerson(owner);

  await store.getOrCreate(ada, undefined);

  const idle = await idleState(pool);

  assert.equal(idle?.role, await ownerRole(owner));
  assert.ok(idle?.uid === null || idle?.uid === '');
});

test("two people's requests running at once on one pool each see only their own row", async (t) => {
  const { pool, store, owner } = await startStore(t, { max: 2 });
  const ada = await newPerson(owner);
  const grace = await newPerson(owner);

  await store.getOrCreate(ada, undefined);
  await store.getOrCreate(grace, undefined);

  const people = Array.from({ length: 20 }, (_, index) => (index % 2 === 0 ? ada : grace));

  const seen = await Promise.all(
    people.map(async (person) => {
      // Waiting between the two queries gives the other requests time to run on the same pool.
      const result = await withUser(pool, person, async (query) => {
        await query('select 1');

        return query('select user_id from user_profiles');
      });

      return { person, rows: result.rows };
    }),
  );

  for (const { person, rows } of seen) {
    assert.deepEqual(rows, [{ user_id: person }]);
  }
});

test("a query function kept after its request ended cannot run on the next person's request", async (t) => {
  const { pool, store, owner } = await startStore(t, { max: 1 });
  const ada = await newPerson(owner);
  const grace = await newPerson(owner);
  const kept: UserQuery[] = [];

  await store.getOrCreate(grace, undefined);
  await withUser(pool, ada, async (query) => {
    kept.push(query);

    return query('select 1');
  });

  await withUser(pool, grace, async (query) => {
    const [leaked] = kept;

    assert.ok(leaked);
    await assert.rejects(async () => leaked("select current_setting('app.user_id', true)"), /only works inside/);

    return query('select 1');
  });
});

test('a query that Postgres cancels for taking too long fails its request and leaves the pool usable', async (t) => {
  const identity = await startIdentity(t);
  const pool = createApiPool({ databaseUrl: identity.config.databaseUrl, timeoutMs: 400, max: 1 });

  t.after(() => pool.end());

  const ada = await newPerson(identity.connections.pool);

  await assert.rejects(withUser(pool, ada, (query) => query('select pg_sleep(2)')), /statement timeout/);

  const next = await withUser(pool, ada, (query) => query('select 1 as one'));

  assert.deepEqual(next.rows, [{ one: 1 }]);
});

test('a query that outlasts the client timeout drops its connection without crashing the process, and the pool recovers', async (t) => {
  const identity = await startIdentity(t);

  // No statement_timeout here, so the client's own timeout fires and pipeline mode destroys the socket.
  const pool = new pg.Pool({
    connectionString: identity.config.databaseUrl,
    query_timeout: 300,
    pipeline: true,
    max: 1,
  });

  pool.on('error', () => {});
  t.after(() => pool.end());

  const ada = await newPerson(identity.connections.pool);

  await assert.rejects(withUser(pool, ada, (query) => query('select pg_sleep(2)')), /timeout|terminated/i);

  const next = await withUser(pool, ada, (query) => query('select 1 as one'));

  assert.deepEqual(next.rows, [{ one: 1 }]);
});
