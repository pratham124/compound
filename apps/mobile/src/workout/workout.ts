import { Exercise } from '@compound/contracts';
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

export const WorkoutExercise = z.object({ id: WorkoutExerciseId, exerciseId: Exercise.shape.id, sets: z.array(WorkoutSet) });

export type WorkoutExercise = z.infer<typeof WorkoutExercise>;

export const Workout = z.object({
  id: WorkoutId,
  startedAt: z.number().int().nonnegative(),
  finishedAt: z.number().int().nonnegative().nullable(),
  exercises: z.array(WorkoutExercise),
});

export type Workout = z.infer<typeof Workout>;

const WHOLE_NUMBER = /^\d+$/;
const DECIMAL = /^\d+(?:[.,]\d+)?$/;
const MAX_REPS = 999;
const MAX_WEIGHT = 99999;

function weightNumber(weight: string) {
  return Number(weight.replace(',', '.'));
}

function validReps(reps: string) {
  return WHOLE_NUMBER.test(reps) && Number(reps) >= 1 && Number(reps) <= MAX_REPS;
}

// Blank means bodyweight, which is allowed.
function validWeight(weight: string) {
  return weight.trim() === '' || (DECIMAL.test(weight) && weightNumber(weight) <= MAX_WEIGHT);
}

export function validSet(set: WorkoutSet) {
  return validReps(set.reps) && validWeight(set.weight);
}

export function weightInUnit(set: WorkoutSet, unit: WeightUnit) {
  if (set.weight.trim() === '' || set.unit === unit) {
    return set.weight;
  }

  const weight = weightNumber(set.weight);

  if (!Number.isFinite(weight)) {
    return set.weight;
  }

  // Gym plates and dumbbells go in steps of 0.5 at the finest, so an exact conversion like 22.05 isn't loadable.
  return String(Math.round((unit === 'lb' ? weight * 2.2046226218 : weight / 2.2046226218) * 2) / 2);
}

export function completedSets(workout: Workout) {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
}
