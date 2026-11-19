import { z } from 'zod';

export const WeightUnit = z.enum(['kg', 'lb']);

export type WeightUnit = z.infer<typeof WeightUnit>;

export const WorkoutId = z.uuid().brand<'WorkoutId'>();

export type WorkoutId = z.infer<typeof WorkoutId>;

export const WorkoutExerciseId = z.uuid().brand<'WorkoutExerciseId'>();

export type WorkoutExerciseId = z.infer<typeof WorkoutExerciseId>;

export const WorkoutSetId = z.uuid().brand<'WorkoutSetId'>();

export type WorkoutSetId = z.infer<typeof WorkoutSetId>;

export const WorkoutSet = z.object({
  id: WorkoutSetId,
  reps: z.string(),
  weight: z.string(),
  unit: WeightUnit,
  done: z.boolean(),
});

export type WorkoutSet = z.infer<typeof WorkoutSet>;

export const WorkoutExercise = z.object({ id: WorkoutExerciseId, exerciseId: z.string(), sets: z.array(WorkoutSet) });

export type WorkoutExercise = z.infer<typeof WorkoutExercise>;

export const Workout = z.object({
  id: WorkoutId,
  startedAt: z.number().int().nonnegative(),
  finishedAt: z.number().int().nonnegative().nullable(),
  exercises: z.array(WorkoutExercise),
});

export type Workout = z.infer<typeof Workout>;

export function validSet(set: WorkoutSet) {
  return /^\d+$/.test(set.reps) && Number(set.reps) > 0 && Number(set.reps) <= 999
    && (set.weight.trim() === '' || (/^\d+(?:[.,]\d+)?$/.test(set.weight) && Number(set.weight.replace(',', '.')) <= 99999));
}

export function weightInUnit(set: WorkoutSet, unit: WeightUnit) {
  if (set.weight.trim() === '' || set.unit === unit) {
    return set.weight;
  }

  const weight = Number(set.weight.replace(',', '.'));

  if (!Number.isFinite(weight)) {
    return set.weight;
  }

  return String(Math.round((unit === 'lb' ? weight * 2.2046226218 : weight / 2.2046226218) * 100) / 100);
}

export function completedSets(workout: Workout) {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
}
