import { readdir, readFile } from 'node:fs/promises';

import type pg from 'pg';

const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);

// Concurrent test files and a second process can start together; the lock makes them take turns.
const LOCK_KEY = 4_190_001;

export async function migrate(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('select pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query('create table if not exists schema_migrations (name text primary key)');

    const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();

    for (const name of files) {
      const applied = await client.query('select 1 from schema_migrations where name = $1', [name]);

      if (applied.rowCount === 0) {
        await client.query('begin');
        await client.query(await readFile(new URL(name, MIGRATIONS_DIR), 'utf8'));
        await client.query('insert into schema_migrations (name) values ($1)', [name]);
        await client.query('commit');
      }
    }
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.query('select pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    client.release();
  }
}
