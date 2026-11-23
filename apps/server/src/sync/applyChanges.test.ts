import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Exercise, MAX_EXERCISES_PER_WORKOUT, MAX_SETS_PER_EXERCISE, SyncChange } from '@compound/contracts';
import { z } from 'zod';

import { SYNC_KINDS } from '../app.ts';
import { withUser } from '../identity/profileStore.ts';
import { startIdentity } from '../identity/testkit.ts';
import { uuidv7 } from '../identity/uuidv7.ts';
import { finishedWorkout, signedInPerson, upload, workoutChange } from '../workouts/testkit.ts';
import { applyChanges, MAX_CLOCK_AHEAD_MS, type SyncRejectionLog } from './applyChanges.ts';
import { defineSyncKind } from './kinds.ts';

// A test-only kind whose write fails the way the body says, to show how each kind of database error is treated.
const failingKind = defineSyncKind({
  kind: 'failing',
  body: z.object({ fail: z.enum(['23514', '22003', '40P01', '40001', 'timeout']) }),
  write: async (query, { body }) => {
    await (body.fail === 'timeout'
      ? query('select pg_sleep(2)')
      : query(`do $$ begin raise exception 'failing kind' using errcode = '${body.fail}'; end $$`));
  },
});

async function startWithFailingKind(t: Parameters<typeof startIdentity>[0]) {
  const identity = await startIdentity(t, { syncKinds: [...SYNC_KINDS, failingKind] });

  return { identity, person: await signedInPerson(identity) };
}

function failing(fail: string) {
  return { key: uuidv7(), kind: 'failing', itemId: uuidv7(), changedAt: Date.now(), body: { fail } };
}

async function versionedItems(identity: Awaited<ReturnType<typeof startIdentity>>, userId: Parameters<typeof withUser>[1]) {
  const result = await withUser(identity.connections.apiPool, userId, (query) => query('select item_id from sync_versions order by item_id'));

  return result.rows.map(({ item_id }) => String(item_id));
}

for (const [code, reason] of [['23514', 'conflict'], ['22003', 'invalid-body']]) {
  test(`a change its own data makes the database refuse (${code}) is rejected alone as ${reason}, and the rest of the upload is kept`, async (t) => {
    const { identity, person } = await startWithFailingKind(t);
    const workoutId = uuidv7();
    const bad = failing(code ?? '');
    const good = workoutChange(workoutId, finishedWorkout());

    const response = await upload(identity, person.headers, [bad, good]);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
      { key: bad.key, outcome: 'rejected', reason },
      { key: good.key, outcome: 'applied' },
    ]));
    assert.deepEqual(await versionedItems(identity, person.userId), [workoutId]);
  });
}

for (const code of ['40P01', '40001', 'timeout']) {
  test(`a passing failure (${code}) fails the whole upload and stores none of it, so the phone keeps it and retries`, async (t) => {
    const { identity, person } = await startWithFailingKind(t);

    const response = await upload(identity, person.headers, [failing(code), workoutChange(uuidv7(), finishedWorkout())]);

    assert.equal(response.statusCode, 500);
    assert.deepEqual(await versionedItems(identity, person.userId), []);
  });
}

test('a change of a kind the server does not know, or with a body that kind refuses, is rejected alone', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const unknown = { key: uuidv7(), kind: 'routine', itemId: uuidv7(), changedAt: Date.now(), body: {} };
  const badBody = { ...workoutChange(uuidv7(), finishedWorkout()), body: { startedAt: 'yesterday' } };
  const badItem = { ...workoutChange(uuidv7(), finishedWorkout()), itemId: 'not-a-uuid' };
  const good = workoutChange(uuidv7(), finishedWorkout());

  const response = await upload(identity, person.headers, [unknown, badBody, badItem, good]);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
    { key: unknown.key, outcome: 'rejected', reason: 'unknown-kind' },
    { key: badBody.key, outcome: 'rejected', reason: 'invalid-body' },
    { key: badItem.key, outcome: 'rejected', reason: 'invalid-change' },
    { key: good.key, outcome: 'applied' },
  ]));
});

test('a change rejected later in an upload does not undo an earlier change in it that was answered applied', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const stored = finishedWorkout([{ reps: 5, weight: 100 }]);
  const takenSetId = stored.exercises[0]?.sets[0]?.id ?? '';

  await upload(identity, person.headers, [workoutChange(uuidv7(), stored)]);

  // Sorted by item id, the fresh workout comes first and the one reusing a stored set's id (a 23505) second.
  const [first, second] = [uuidv7(), uuidv7()].sort();
  const fresh = workoutChange(first ?? '', finishedWorkout([{ reps: 3, weight: 60 }]));
  const clashing = finishedWorkout([{ reps: 8, weight: 80 }]);
  const clash = workoutChange(second ?? '', { ...clashing, exercises: clashing.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, id: takenSetId })) })) });

  const response = await upload(identity, person.headers, [clash, fresh]);

  assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
    { key: fresh.key, outcome: 'applied' },
    { key: clash.key, outcome: 'rejected', reason: 'conflict' },
  ]));
  assert.ok((await versionedItems(identity, person.userId)).includes(first ?? ''), 'the applied change is stored');
});

test('each rejected change is logged with its kind, reason and database code, and nothing from its body or person', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const stored = finishedWorkout([{ reps: 5, weight: 100 }]);
  const takenSetId = stored.exercises[0]?.sets[0]?.id ?? '';

  await upload(identity, person.headers, [workoutChange(uuidv7(), stored)]);

  const clashing = finishedWorkout([{ reps: 8, weight: 80 }]);
  const clash = workoutChange(uuidv7(), { ...clashing, exercises: clashing.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, id: takenSetId })) })) });
  const unknown = { key: uuidv7(), kind: 'routine', itemId: uuidv7(), changedAt: Date.now(), body: { name: 'Upper A' } };
  const logged: SyncRejectionLog[] = [];

  await applyChanges({
    pool: identity.connections.apiPool,
    userId: person.userId,
    kinds: new Map(SYNC_KINDS.map((kind) => [kind.kind, kind])),
    log: { warn: (fields) => { logged.push(fields); } },
    changes: [SyncChange.parse(unknown), SyncChange.parse(clash)],
  });

  assert.deepEqual(new Set(logged), new Set([
    { event: 'sync_change_rejected', kind: 'routine', reason: 'unknown-kind' },
    { event: 'sync_change_rejected', kind: 'workout', reason: 'conflict', pgCode: '23505', constraint: 'workout_sets_pkey' },
  ]));
});

test('a workout whose exercise id holds a NUL byte (22021) is rejected alone instead of failing every retry of the upload', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const body = finishedWorkout();
  const nul = workoutChange(uuidv7(), { ...body, exercises: body.exercises.map((exercise) => ({ ...exercise, exerciseId: Exercise.shape.id.parse('Squat\u0000') })) });
  const good = workoutChange(uuidv7(), finishedWorkout());

  const response = await upload(identity, person.headers, [nul, good]);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
    { key: nul.key, outcome: 'rejected', reason: 'invalid-body' },
    { key: good.key, outcome: 'applied' },
  ]));
});

test('a workout with more exercises, or more sets in one exercise, than the caps is rejected too-large and the rest is kept', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const oneExercise = finishedWorkout([{ reps: 5, weight: 100 }]);

  const manyExercises = workoutChange(uuidv7(), {
    ...oneExercise,
    exercises: Array.from({ length: MAX_EXERCISES_PER_WORKOUT + 1 }, () => finishedWorkout([{ reps: 5, weight: 100 }]).exercises).flat(),
  });

  const manySets = workoutChange(uuidv7(), finishedWorkout(Array.from({ length: MAX_SETS_PER_EXERCISE + 1 }, () => ({ reps: 5, weight: 100 }))));
  const atTheCaps = workoutChange(uuidv7(), finishedWorkout(Array.from({ length: MAX_SETS_PER_EXERCISE }, () => ({ reps: 5, weight: 100 }))));

  const response = await upload(identity, person.headers, [manyExercises, manySets, atTheCaps]);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
    { key: manyExercises.key, outcome: 'rejected', reason: 'too-large' },
    { key: manySets.key, outcome: 'rejected', reason: 'too-large' },
    { key: atTheCaps.key, outcome: 'applied' },
  ]));
});

test('a change stamped more than five minutes after the server clock is rejected clock; one a minute ahead is applied', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const ahead = workoutChange(uuidv7(), finishedWorkout(), Date.now() + MAX_CLOCK_AHEAD_MS + 60_000);
  const skewed = workoutChange(uuidv7(), finishedWorkout(), Date.now() + 60_000);

  const response = await upload(identity, person.headers, [ahead, skewed]);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(new Set(response.json<{ results: unknown[] }>().results), new Set([
    { key: ahead.key, outcome: 'rejected', reason: 'clock' },
    { key: skewed.key, outcome: 'applied' },
  ]));
  assert.deepEqual(await versionedItems(identity, person.userId), [skewed.itemId]);
});

test('two uploads of the same two workouts in opposite orders, at the same moment, both succeed', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);

  for (let round = 0; round < 5; round += 1) {
    const [first, second] = [uuidv7(), uuidv7()];
    const a = [workoutChange(first, finishedWorkout(), 1_000), workoutChange(second, finishedWorkout(), 1_000)];
    const b = [workoutChange(second, finishedWorkout(), 2_000), workoutChange(first, finishedWorkout(), 2_000)];

    const responses = await Promise.all([upload(identity, person.headers, a), upload(identity, person.headers, b)]);

    assert.deepEqual(responses.map((response) => response.statusCode), [200, 200], `round ${round}`);
  }
});
