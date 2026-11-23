import { z } from 'zod';

import { Exercise } from './exercises.ts';
import { UuidV7 } from './sync.ts';

export const SYNC_KIND_WORKOUT = 'workout';

export const MAX_EXERCISES_PER_WORKOUT = 50;
export const MAX_SETS_PER_EXERCISE = 50;

const Timestamp = z.number().int().min(0).max(8_640_000_000_000_000);

export const ServerWorkoutSet = z.object({
  id: UuidV7,
  reps: z.number().int().min(1).max(999),
  /** Null is bodyweight. */
  weight: z.number().min(0).max(99999).nullable(),
  unit: z.enum(['kg', 'lb']),
});

export type ServerWorkoutSet = z.infer<typeof ServerWorkoutSet>;

export const ServerWorkoutExercise = z.object({
  id: UuidV7,
  exerciseId: Exercise.shape.id.and(z.string().max(100)),
  sets: z.array(ServerWorkoutSet).max(MAX_SETS_PER_EXERCISE),
});

const WorkoutFields = z.object({
  startedAt: Timestamp,
  finishedAt: Timestamp,
  exercises: z.array(ServerWorkoutExercise).max(MAX_EXERCISES_PER_WORKOUT),
});

/** A finished workout as the phone uploads it: only its ticked sets, with numbers parsed. */
export const WorkoutBody = WorkoutFields.superRefine((workout, context) => {
  if (workout.finishedAt < workout.startedAt) {
    context.addIssue({ code: 'custom', message: 'The workout finishes before it starts' });
  }

  const ids = workout.exercises.flatMap((exercise) => [exercise.id, ...exercise.sets.map((set) => set.id)]);

  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', message: 'An exercise or set id appears twice' });
  }
});

export type WorkoutBody = z.infer<typeof WorkoutBody>;

export const ServerWorkout = WorkoutFields.extend({ id: UuidV7 });

export type ServerWorkout = z.infer<typeof ServerWorkout>;

export const WorkoutParams = z.object({ id: UuidV7 });

export const WorkoutNotFound = z.object({ error: z.literal('not-found') });
