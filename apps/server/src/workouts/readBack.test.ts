import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDeepStrictEqual } from 'node:util';

import { Exercise } from '@compound/contracts';

import { withUser } from '../identity/profileStore.ts';
import { startIdentity } from '../identity/testkit.ts';
import { uuidv7 } from '../identity/uuidv7.ts';
import { finishedWorkout, signedInPerson, upload, workoutChange } from './testkit.ts';
import { readWorkout } from './workoutStore.ts';

test('a workout uploaded from the phone reads back from the server as it was sent, exercises and sets in order', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const workoutId = uuidv7();
  const body = finishedWorkout([{ reps: 5, weight: 102.5 }, { reps: 12, weight: null }, { reps: 3, weight: 0 }]);
  const second = { id: uuidv7(), exerciseId: Exercise.shape.id.parse('Pushups'), sets: [] };
  const sent = { ...body, exercises: [...body.exercises, second] };

  await upload(identity, person.headers, [workoutChange(workoutId, sent)]);
  const response = await identity.client.inject({ method: 'GET', url: `/workouts/${workoutId}`, headers: person.headers });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { id: workoutId, ...sent });
});

test('a workout id the server has never stored reads back as not found', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);

  const response = await identity.client.inject({ method: 'GET', url: `/workouts/${uuidv7()}`, headers: person.headers });

  assert.equal(response.statusCode, 404);
});

test('reading a workout needs a session', async (t) => {
  const identity = await startIdentity(t);

  const response = await identity.client.inject({ method: 'GET', url: `/workouts/${uuidv7()}` });

  assert.equal(response.statusCode, 401);
});

test('a read that overlaps an upload of the same workout returns one whole version, never a mix of both', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const workoutId = uuidv7();
  const before = finishedWorkout([{ reps: 5, weight: 100 }]);
  const after = { ...finishedWorkout([{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }]), startedAt: before.startedAt + 60_000 };

  await upload(identity, person.headers, [workoutChange(workoutId, before, 1000)]);

  let firstStatement: Promise<unknown> | null = null;
  let newerUpload: Promise<unknown> | null = null;

  // Lets the read's first statement run, then commits a newer version of the workout before any later statement of
  // the same read runs.
  const read = await withUser(identity.connections.apiPool, person.userId, (query) => readWorkout(async (text, values) => {
    if (firstStatement === null) {
      const result = query(text, values);

      firstStatement = result;
      await result;
      newerUpload = upload(identity, person.headers, [workoutChange(workoutId, after, 2000)]);
      await newerUpload;

      return result;
    }

    await firstStatement;
    await newerUpload;

    return query(text, values);
  }, { userId: person.userId, workoutId }));

  assert.ok([{ id: workoutId, ...before }, { id: workoutId, ...after }].some((version) => isDeepStrictEqual(read, version)), JSON.stringify(read));
});
