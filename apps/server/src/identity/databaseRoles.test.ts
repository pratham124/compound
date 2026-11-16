import assert from 'node:assert/strict';
import { test } from 'node:test';

import type pg from 'pg';

import { startIdentity } from './testkit.ts';

async function tablesReachableBy(pool: pg.Pool, role: string) {
  const result = await pool.query<{ name: string }>(
    `select c.relname as name
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r', 'p')
        and n.nspname = 'public'
        and has_table_privilege($1, c.oid, 'select, insert, update, delete')
      order by c.relname`,
    [role],
  );

  return result.rows.map(({ name }) => name);
}

test('the api role can reach only user_profiles, and the sign-in role only users and accounts', async (t) => {
  const { connections } = await startIdentity(t);

  assert.deepEqual(await tablesReachableBy(connections.pool, 'compound_api'), ['user_profiles']);
  assert.deepEqual(await tablesReachableBy(connections.pool, 'compound_auth'), ['accounts', 'users']);
});

test('the sign-in role cannot delete people', async (t) => {
  const { connections } = await startIdentity(t);

  const canDeleteUsers = await connections.pool.query("select has_table_privilege('compound_auth', 'users', 'delete') as allowed");

  assert.deepEqual(canDeleteUsers.rows, [{ allowed: false }]);
});

test("better-auth's connection runs as compound_auth, which is not a superuser and cannot bypass row-level security", async (t) => {
  const { connections } = await startIdentity(t);

  const who = await connections.authPool.query(
    'select current_user as user, rolsuper as superuser, rolbypassrls as bypass from pg_roles where rolname = current_user',
  );

  assert.deepEqual(who.rows, [{ user: 'compound_auth', superuser: false, bypass: false }]);
});
