import { SYNC_KIND_WORKOUT, ServerWorkout, WorkoutBody, type UserId } from '@compound/contracts';
import type { CompiledQuery } from 'kysely';
import type pg from 'pg';
import { z } from 'zod';

import { createQueryBuilder } from '../db/queryBuilder.ts';
import type { UserQuery } from '../identity/profileStore.ts';
import { defineSyncKind } from '../sync/kinds.ts';
import type { WorkoutsDatabase } from './tables.ts';

const queries = createQueryBuilder<WorkoutsDatabase>();

function send(query: UserQuery, compiled: CompiledQuery): Promise<pg.QueryResult> {
  return query(compiled.sql, compiled.parameters);
}

/** A finished workout replaces whatever was stored under its id, so the stored sets are exactly the winning upload's. */
export const workoutKind = defineSyncKind({
  kind: SYNC_KIND_WORKOUT,
  body: WorkoutBody,
  write: async (query, { userId, itemId, body }) => {
    await send(query, queries
      .insertInto('workouts')
      .values({ user_id: userId, id: itemId, started_at: new Date(body.startedAt), finished_at: new Date(body.finishedAt) })
      .onConflict((conflict) => conflict.columns(['user_id', 'id']).doUpdateSet((eb) => ({
        started_at: eb.ref('excluded.started_at'),
        finished_at: eb.ref('excluded.finished_at'),
      })))
      .compile());

    await send(query, queries.deleteFrom('workout_exercises').where('user_id', '=', userId).where('workout_id', '=', itemId).compile());

    if (body.exercises.length === 0) {
      return;
    }

    await send(query, queries
      .insertInto('workout_exercises')
      .values(body.exercises.map((exercise, position) => ({ user_id: userId, workout_id: itemId, id: exercise.id, position, exercise_id: exercise.exerciseId })))
      .compile());

    const sets = body.exercises.flatMap((exercise) => exercise.sets.map((set, position) => ({
      user_id: userId,
      workout_exercise_id: exercise.id,
      id: set.id,
      position,
      reps: set.reps,
      weight: set.weight,
      unit: set.unit,
    })));

    if (sets.length > 0) {
      await send(query, queries.insertInto('workout_sets').values(sets).compile());
    }
  },
});

const StoredWorkout = z.object({
  started_at: z.date(),
  finished_at: z.date(),
  exercises: z.array(z.object({
    id: z.string(),
    exercise_id: z.string(),
    sets: z.array(z.object({ id: z.string(), reps: z.number(), weight: z.number().nullable(), unit: z.string() })),
  })),
});

// One statement, so the whole workout comes from one snapshot: under read committed, separate reads of the workout,
// its exercises and its sets could each see a different upload of it.
const READ_WORKOUT = `select w.started_at, w.finished_at,
    coalesce((
      select json_agg(json_build_object(
        'id', e.id,
        'exercise_id', e.exercise_id,
        'sets', coalesce((
          select json_agg(json_build_object('id', s.id, 'reps', s.reps, 'weight', s.weight, 'unit', s.unit) order by s.position)
            from workout_sets s
           where s.user_id = e.user_id and s.workout_exercise_id = e.id
        ), '[]'::json)
      ) order by e.position)
        from workout_exercises e
       where e.user_id = w.user_id and e.workout_id = w.id
    ), '[]'::json) as exercises
  from workouts w
 where w.user_id = $1 and w.id = $2`;

/** The stored workout, or null when this person has none with this id. */
export async function readWorkout(query: UserQuery, { userId, workoutId }: { userId: UserId; workoutId: string }): Promise<ServerWorkout | null> {
  const workout = z.array(StoredWorkout).parse((await query(READ_WORKOUT, [userId, workoutId])).rows)[0];

  if (workout === undefined) {
    return null;
  }

  return ServerWorkout.parse({
    id: workoutId,
    startedAt: workout.started_at.getTime(),
    finishedAt: workout.finished_at.getTime(),
    exercises: workout.exercises.map((exercise) => ({ id: exercise.id, exerciseId: exercise.exercise_id, sets: exercise.sets })),
  });
}
