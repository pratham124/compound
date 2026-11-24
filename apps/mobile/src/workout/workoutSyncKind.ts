import { bodyRejection, SYNC_KIND_WORKOUT, WorkoutBody } from '@compound/contracts';
import { z } from 'zod';

import type { SyncKind } from '../sync/kinds.ts';
import { setWeight, validSet, Workout } from './workout.ts';

/** What the server keeps of a finished workout: every exercise, and only the sets that were ticked and are still valid. */
export function workoutBody(workout: Workout & { finishedAt: number }) {
  return WorkoutBody.safeParse({
    startedAt: workout.startedAt,
    finishedAt: workout.finishedAt,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      sets: exercise.sets
        .filter((set) => set.done && validSet(set))
        .map((set) => ({ id: set.id, reps: Number(set.reps), weight: setWeight(set), unit: set.unit })),
    })),
  });
}

const StoredRow = z.object({ body: z.string() });

function storedWorkout(body: string): Workout | null {
  try {
    const workout = Workout.safeParse(JSON.parse(body));

    return workout.success ? workout.data : null;
  } catch {
    return null;
  }
}

export const workoutSyncKind: SyncKind = {
  kind: SYNC_KIND_WORKOUT,
  load: async (db, { userId, itemId }) => {
    const rows = await db.getAllAsync('SELECT body FROM workouts WHERE user_id = ? AND id = ? AND finished_at IS NOT NULL', userId, itemId);

    if (rows.length === 0) {
      return { status: 'gone' };
    }

    const row = StoredRow.safeParse(rows[0]);
    const workout = row.success ? storedWorkout(row.data.body) : null;

    if (workout === null || workout.finishedAt === null) {
      return { status: 'invalid', reason: 'invalid-body' };
    }

    const body = workoutBody({ ...workout, finishedAt: workout.finishedAt });

    return body.success ? { status: 'ready', body: body.data } : { status: 'invalid', reason: bodyRejection(body.error) };
  },
};
