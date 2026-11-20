import type { Exercise } from '@compound/contracts';

import type { WeightUnit, Workout, WorkoutExerciseId, WorkoutSetId } from './workout.ts';

/** Catalogue ids of the exercises on a workout's cards, for marking them in the picker. */
export function catalogueIdsIn(workout: Workout): ReadonlySet<Exercise['id']> {
  return new Set(workout.exercises.map((exercise) => exercise.exerciseId));
}

export type Pick = { kind: 'existing'; focus: WorkoutExerciseId } | { kind: 'added'; workout: Workout };

/** An exercise already in the workout is not added again; older saved workouts may hold duplicates, so the first card wins. */
export function pickExercise(workout: Workout, exerciseId: Exercise['id'], unit: WeightUnit, ids: { exercise: WorkoutExerciseId; set: WorkoutSetId }): Pick {
  const existing = workout.exercises.find((exercise) => exercise.exerciseId === exerciseId);

  if (existing !== undefined) {
    return { kind: 'existing', focus: existing.id };
  }

  return {
    kind: 'added',
    workout: { ...workout, exercises: [...workout.exercises, { id: ids.exercise, exerciseId, sets: [{ id: ids.set, reps: '', weight: '', unit, done: false }] }] },
  };
}
