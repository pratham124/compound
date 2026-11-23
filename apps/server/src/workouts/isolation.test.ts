import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withUser } from '../identity/profileStore.ts';
import { startIdentity } from '../identity/testkit.ts';
import { uuidv7 } from '../identity/uuidv7.ts';
import { finishedWorkout, signedInPerson, upload, workoutChange } from './testkit.ts';

const TABLES = ['workouts', 'workout_exercises', 'workout_sets', 'sync_versions'];

async function twoPeopleWithWorkouts(t: Parameters<typeof startIdentity>[0]) {
  const identity = await startIdentity(t);
  const ada = await signedInPerson(identity);
  const grace = await signedInPerson(identity);
  const adaWorkout = uuidv7();

  await upload(identity, ada.headers, [workoutChange(adaWorkout, finishedWorkout([{ reps: 5, weight: 100 }]))]);
  await upload(identity, grace.headers, [workoutChange(uuidv7(), finishedWorkout([{ reps: 8, weight: 60 }]))]);

  return { identity, ada, grace, adaWorkout };
}

test("one person can't read another's workout through the app, or overwrite it by uploading under its id", async (t) => {
  const { identity, ada, grace, adaWorkout } = await twoPeopleWithWorkouts(t);
  const before = await identity.client.inject({ method: 'GET', url: `/workouts/${adaWorkout}`, headers: ada.headers });

  const read = await identity.client.inject({ method: 'GET', url: `/workouts/${adaWorkout}`, headers: grace.headers });
  const overwrite = await upload(identity, grace.headers, [workoutChange(adaWorkout, finishedWorkout([{ reps: 1, weight: 1 }]), Date.now())]);
  const after = await identity.client.inject({ method: 'GET', url: `/workouts/${adaWorkout}`, headers: ada.headers });

  assert.equal(read.statusCode, 404);
  assert.equal(overwrite.statusCode, 200);
  assert.deepEqual(after.json(), before.json());
});

test("with the app's own user filter removed, row-level security still shows, changes and accepts only the person's own workout rows", async (t) => {
  const { identity, ada, grace } = await twoPeopleWithWorkouts(t);
  const { apiPool } = identity.connections;

  for (const table of TABLES) {
    const owners = await withUser(apiPool, grace.userId, (query) => query(`select distinct user_id from ${table}`));

    assert.deepEqual(owners.rows, [{ user_id: grace.userId }], table);
  }

  const updated = await withUser(apiPool, grace.userId, (query) => query("update workouts set finished_at = finished_at + interval '1 minute'"));

  assert.equal(updated.rowCount, 1);

  await assert.rejects(
    withUser(apiPool, grace.userId, (query) => query('insert into workouts (user_id, id, started_at, finished_at) values ($1, $2, now(), now())', [ada.userId, uuidv7()])),
    /row-level security/,
  );
  await assert.rejects(
    withUser(apiPool, grace.userId, (query) => query("insert into sync_versions (user_id, kind, item_id, changed_at, change_key) values ($1, 'workout', $2, now(), $3)", [ada.userId, uuidv7(), uuidv7()])),
    /row-level security/,
  );
});

test('a query that never says who is asking sees no workouts', async (t) => {
  const { identity } = await twoPeopleWithWorkouts(t);
  const client = await identity.connections.apiPool.connect();

  try {
    await client.query('begin; set local role compound_api');

    for (const table of TABLES) {
      assert.equal((await client.query(`select 1 from ${table}`)).rowCount, 0, table);
    }
  } finally {
    await client.query('rollback');
    client.release();
  }
});

test('the api role cannot delete workouts, sets or sync versions, only the exercises a replaced workout drops', async (t) => {
  const identity = await startIdentity(t);
  const can = async (table: string) => (await identity.connections.pool.query<{ allowed: boolean }>("select has_table_privilege('compound_api', $1, 'delete') as allowed", [table])).rows[0]?.allowed;

  assert.deepEqual(await Promise.all(TABLES.map(can)), [false, true, false, false]);
});
