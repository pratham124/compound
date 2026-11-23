import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WorkoutBody } from '@compound/contracts';
import fc from 'fast-check';

import { withUser } from '../identity/profileStore.ts';
import { startIdentity } from '../identity/testkit.ts';
import { uuidv7 } from '../identity/uuidv7.ts';
import { finishedWorkout, signedInPerson, upload, workoutChange, type Change } from './testkit.ts';

type Identity = Awaited<ReturnType<typeof startIdentity>>;

async function storedReps(identity: Identity, userId: Parameters<typeof withUser>[1], workoutId: string) {
  const result = await withUser(identity.connections.apiPool, userId, (query) =>
    query('select s.reps from workout_sets s join workout_exercises e on e.user_id = s.user_id and e.id = s.workout_exercise_id where e.workout_id = $1 order by s.position', [workoutId]),
  );

  return result.rows.map(({ reps }) => Number(reps));
}

const earlier = Date.UTC(2026, 10, 20, 18, 0);
const later = earlier + 60_000;

for (const order of ['earlier edit arrives first', 'later edit arrives first']) {
  test(`the later edit wins, whichever device's upload arrives first (${order})`, async (t) => {
    const identity = await startIdentity(t);
    const person = await signedInPerson(identity);
    const workoutId = uuidv7();
    const phone = workoutChange(workoutId, finishedWorkout([{ reps: 5, weight: 100 }]), earlier);
    const tablet = workoutChange(workoutId, finishedWorkout([{ reps: 8, weight: 100 }]), later);

    for (const change of order === 'earlier edit arrives first' ? [phone, tablet] : [tablet, phone]) {
      await upload(identity, person.headers, [change]);
    }

    assert.deepEqual(await storedReps(identity, person.userId, workoutId), [8]);
  });
}

test('an earlier and a later edit uploaded at the same moment on two connections: the later one always wins', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);

  for (let round = 0; round < 10; round += 1) {
    const workoutId = uuidv7();
    const older = workoutChange(workoutId, finishedWorkout([{ reps: 5, weight: 100 }]), earlier);
    const newer = workoutChange(workoutId, finishedWorkout([{ reps: 8, weight: 100 }]), later);
    const [first, second] = round % 2 === 0 ? [older, newer] : [newer, older];

    await Promise.all([upload(identity, person.headers, [first]), upload(identity, person.headers, [second])]);

    assert.deepEqual(await storedReps(identity, person.userId, workoutId), [8], `round ${round}`);
  }
});

test("a later edit that keeps the workout's exercise and set ids replaces their reps", async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);
  const workoutId = uuidv7();
  const first = finishedWorkout([{ reps: 5, weight: 100 }, { reps: 5, weight: 100 }]);
  const edited = { ...first, exercises: first.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, reps: 8 })) })) };

  await upload(identity, person.headers, [workoutChange(workoutId, first, earlier)]);
  const response = await upload(identity, person.headers, [workoutChange(workoutId, edited, later)]);

  assert.deepEqual(response.json<{ results: { outcome: string }[] }>().results.map(({ outcome }) => outcome), ['applied']);
  assert.deepEqual(await storedReps(identity, person.userId, workoutId), [8, 8]);
});

/** A workout whose ids come from its item's own small pools, so later edits reuse an earlier edit's exercise and set ids. */
function pooledWorkout(pool: { exercises: readonly string[]; sets: readonly string[] }, edit: { exercise: number; setOffset: number; reps: readonly number[] }): WorkoutBody {
  const body = finishedWorkout([]);

  return {
    ...body,
    exercises: body.exercises.map((exercise) => ({
      ...exercise,
      id: pool.exercises[edit.exercise] ?? exercise.id,
      sets: edit.reps.map((reps, index) => ({ id: pool.sets[(edit.setOffset + index) % pool.sets.length] ?? '', reps, weight: null, unit: 'kg' as const })),
    })),
  };
}

function newest<T extends Change>(changes: readonly T[]): T | undefined {
  return changes.reduce<T | undefined>((best, change) =>
    best === undefined || change.changedAt > best.changedAt || (change.changedAt === best.changedAt && change.key > best.key) ? change : best, undefined);
}

test('any mix of edits, replays and batch splits, in any order, leaves each workout as its newest edit with each set once', async (t) => {
  const identity = await startIdentity(t);
  const person = await signedInPerson(identity);

  // Each edit is (which of two workouts, a small clock reading so ties happen, which of its item's ids it uses, its
  // reps); then it is replayed some number of times, the whole lot shuffled and split into uploads.
  const edits = fc.array(fc.record({
    item: fc.integer({ min: 0, max: 1 }),
    clock: fc.integer({ min: 0, max: 3 }),
    exercise: fc.integer({ min: 0, max: 1 }),
    setOffset: fc.integer({ min: 0, max: 3 }),
    reps: fc.array(fc.integer({ min: 1, max: 999 }), { maxLength: 4 }),
    replays: fc.integer({ min: 0, max: 2 }),
  }), { minLength: 1, maxLength: 6 });

  await fc.assert(
    fc.asyncProperty(edits, fc.integer({ min: 1, max: 5 }), fc.array(fc.nat(), { minLength: 18, maxLength: 18 }), async (planned, batchSize, ranks) => {
      const workoutIds = [uuidv7(), uuidv7()];
      const pools = workoutIds.map(() => ({ exercises: [uuidv7(), uuidv7()], sets: [uuidv7(), uuidv7(), uuidv7(), uuidv7()] }));

      const changes = planned.map((edit) =>
        workoutChange(workoutIds[edit.item] ?? '', pooledWorkout(pools[edit.item] ?? { exercises: [], sets: [] }, edit), earlier + edit.clock));

      const sends = planned.flatMap(({ replays }, index) => Array.from({ length: replays + 1 }, () => changes[index]).filter((change) => change !== undefined));
      const shuffled = sends.map((change, index) => ({ change, rank: ranks[index] ?? 0 })).toSorted((a, b) => a.rank - b.rank).map(({ change }) => change);

      for (let start = 0; start < shuffled.length; start += batchSize) {
        const response = await upload(identity, person.headers, shuffled.slice(start, start + batchSize));

        assert.equal(response.statusCode, 200);
      }

      for (const workoutId of workoutIds) {
        const winner = newest(changes.filter((change) => change.itemId === workoutId));
        const expected = winner?.body.exercises.flatMap((exercise) => exercise.sets.map((set) => set.reps)) ?? [];

        assert.deepEqual(await storedReps(identity, person.userId, workoutId), expected);
      }
    }),
    { numRuns: 25 },
  );
});

