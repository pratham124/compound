import { TimeZone, Units, type Profile, type UserId } from '@compound/contracts';
import { sql, type CompiledQuery, type ExpressionBuilder } from 'kysely';
import type pg from 'pg';
import { z } from 'zod';

import { createQueryBuilder } from '../db/queryBuilder.ts';
import type { IdentityDatabase } from './tables.ts';

const ProfileRow = z
  .object({ time_zone: TimeZone, units: Units })
  .transform(({ time_zone, units }): Profile => ({ timeZone: time_zone, units }));

export type UserQuery = (text: string, values?: readonly unknown[]) => Promise<pg.QueryResult>;

/**
 * Runs `run` in a transaction as the api role with `app.user_id` set to this person, so row-level security
 * only lets them see their own rows. The setup statements are sent without waiting for each other, so the
 * first query inside `run` travels in the same round trip. The pool must be created with `pipeline: true`.
 * The `query` passed to `run` stops working when the transaction ends, so a copy kept past that point can't
 * run on a connection that now belongs to someone else.
 */
export async function withUser<T>(pool: pg.Pool, userId: UserId, run: (query: UserQuery) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let connectionError: Error | undefined;
  let open = true;

  // A checked-out client has no error listener from the pool, and pipeline mode destroys the socket when a query
  // times out, so without this the error would be uncaught and end the process.
  const onError = (error: Error) => {
    connectionError = error;
  };

  client.on('error', onError);

  const query: UserQuery = (text, values) => {
    if (!open) {
      throw new Error('This query function only works inside the withUser call that made it');
    }

    return client.query(text, values === undefined ? undefined : [...values]);
  };

  try {
    const [begin, config, outcome] = await Promise.allSettled([
      client.query('begin; set local role compound_api'),
      client.query("select set_config('app.user_id', $1, true)", [userId]),
      (async () => run(query))(),
    ]);

    open = false;

    if (begin.status === 'rejected') {
      throw begin.reason;
    }

    if (config.status === 'rejected') {
      throw config.reason;
    }

    if (outcome.status === 'rejected') {
      throw outcome.reason;
    }

    await client.query('commit');

    return outcome.value;
  } catch (error) {
    open = false;

    await client.query('rollback').catch((rollbackError: Error) => {
      connectionError ??= rollbackError;
    });

    throw error;
  } finally {
    client.off('error', onError);
    client.release(connectionError);
  }
}


export type ProfileStore = {
  /** The person's profile, created with the given time zone the first time they ask. */
  getOrCreate: (userId: UserId, timeZone: TimeZone | undefined) => Promise<Profile>;
  setUnits: (userId: UserId, units: Units) => Promise<Profile>;
};

const queries = createQueryBuilder<IdentityDatabase>();

/** Sends a query Kysely has only compiled; Kysely itself never executes anything. */
function send(query: UserQuery, compiled: CompiledQuery): Promise<pg.QueryResult> {
  return query(compiled.sql, compiled.parameters);
}

export function createProfileStore(pool: pg.Pool): ProfileStore {
  return {
    getOrCreate: (userId, timeZone) =>
      withUser(pool, userId, async (query) => {
        // UTC stands in until the phone reports a zone; a zone the phone did report is never replaced.
        const reported = (eb: ExpressionBuilder<IdentityDatabase, 'user_profiles'>) => eb.cast<string | null>(eb.val(timeZone ?? null), 'text');

        const create = queries
          .insertInto('user_profiles')
          .values((eb) => ({
            user_id: userId,
            time_zone: eb.fn.coalesce(reported(eb), sql.lit('UTC')),
            units: 'metric' as const,
            time_zone_is_fallback: eb(reported(eb), 'is', null).$castTo<boolean>(),
          }))
          .onConflict((conflict) =>
            conflict
              .column('user_id')
              .doUpdateSet((eb) => ({
                time_zone: eb.ref('excluded.time_zone'),
                time_zone_is_fallback: false,
                updated_at: sql`now()`,
              }))
              .where((eb) => eb.and([eb.ref('user_profiles.time_zone_is_fallback'), eb.not(eb.ref('excluded.time_zone_is_fallback'))])),
          )
          .compile();

        const read = queries.selectFrom('user_profiles').select(['time_zone', 'units']).where('user_id', '=', userId).compile();

        const [, selected] = await Promise.all([send(query, create), send(query, read)]);

        return ProfileRow.parse(selected.rows[0]);
      }),
    setUnits: (userId, units) =>
      withUser(pool, userId, async (query) => {
        const upsert = queries
          .insertInto('user_profiles')
          .values({ user_id: userId, time_zone: 'UTC', units, time_zone_is_fallback: true })
          .onConflict((conflict) =>
            conflict.column('user_id').doUpdateSet((eb) => ({ units: eb.ref('excluded.units'), updated_at: sql`now()` })),
          )
          .returning(['time_zone', 'units'])
          .compile();

        const updated = await send(query, upsert);

        return ProfileRow.parse(updated.rows[0]);
      }),
  };
}
