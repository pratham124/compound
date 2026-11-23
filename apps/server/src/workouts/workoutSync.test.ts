import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withUser } from '../identity/profileStore.ts';
import { startIdentity } from '../identity/testkit.ts';
import { uuidv7 } from '../identity/uuidv7.ts';
import { finishedWorkout, signedInPerson, upload, workoutChange } from './testkit.ts';

test('an uploaded finished workout is stored with its sets for the person who sent it', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const workoutId = uuidv7();
  const change = workoutChange(workoutId, finishedWorkout([{ reps: 5, weight: 100 }, { reps: 8, weight: null }]));

  const response = await upload(identity, person.headers, [change]);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { results: [{ key: change.key, outcome: 'applied' }] });

  const sets = await withUser(identity.connections.apiPool, person.userId, (query) =>
    query('select s.reps, s.weight, s.unit from workout_sets s join workout_exercises e on e.user_id = s.user_id and e.id = s.workout_exercise_id where e.workout_id = $1 order by s.position', [workoutId]),
  );

  assert.deepEqual(sets.rows, [{ reps: 5, weight: '100', unit: 'kg' }, { reps: 8, weight: null, unit: 'kg' }]);
});

test('an upload with no session is refused', async (t) => {
  const identity = await startIdentity(t);

  const response = await upload(identity, { cookie: '' }, [workoutChange(uuidv7(), finishedWorkout())]);

  assert.equal(response.statusCode, 401);
});

async function storedSetIds(identity: Awaited<ReturnType<typeof startIdentity>>, userId: Parameters<typeof withUser>[1], workoutId: string) {
  const result = await withUser(identity.connections.apiPool, userId, (query) =>
    query('select s.id from workout_sets s join workout_exercises e on e.user_id = s.user_id and e.id = s.workout_exercise_id where e.workout_id = $1 order by s.id', [workoutId]),
  );

  return result.rows.map(({ id }) => String(id));
}

test('replaying an upload whose answer was lost stores exactly one copy of each set, and answers stale', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const workoutId = uuidv7();
  const body = finishedWorkout([{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }]);
  const change = workoutChange(workoutId, body);

  await upload(identity, person.headers, [change]);
  const replay = await upload(identity, person.headers, [change]);

  assert.deepEqual(replay.json(), { results: [{ key: change.key, outcome: 'stale' }] });
  assert.deepEqual(await storedSetIds(identity, person.userId, workoutId), body.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id)).sort());
});

test('the same upload sent twice at once, as a retry after a timeout can be, stores exactly one copy of each set', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const workoutId = uuidv7();
  const body = finishedWorkout([{ reps: 3, weight: 140 }]);
  const change = workoutChange(workoutId, body);

  const answers = await Promise.all([upload(identity, person.headers, [change]), upload(identity, person.headers, [change])]);

  assert.deepEqual(new Set(answers.map((answer) => answer.json<{ results: { outcome: string }[] }>().results[0]?.outcome)), new Set(['applied', 'stale']));
  assert.deepEqual(await storedSetIds(identity, person.userId, workoutId), [body.exercises[0]?.sets[0]?.id]);
});

test('a workout that finishes before it starts is rejected invalid-body and stores nothing; one that finishes as it starts is applied', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const body = finishedWorkout();
  const backwards = workoutChange(uuidv7(), { ...body, finishedAt: body.startedAt - 1 }, body.finishedAt);
  const instant = workoutChange(uuidv7(), { ...body, finishedAt: body.startedAt });

  const response = await upload(identity, person.headers, [backwards, instant]);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
    { key: backwards.key, outcome: 'rejected', reason: 'invalid-body' },
    { key: instant.key, outcome: 'applied' },
  ]));
});

test('the database itself refuses a workout row that finishes before it starts', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);

  await assert.rejects(
    withUser(identity.connections.apiPool, person.userId, (query) =>
      query('insert into workouts (user_id, id, started_at, finished_at) values ($1, $2, $3, $4)', [person.userId, uuidv7(), new Date(Date.UTC(2026, 10, 20, 18)), new Date(Date.UTC(2026, 10, 20, 17))])),
    { code: '23514', constraint: 'workouts_check' },
  );
});
