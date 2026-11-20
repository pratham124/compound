import type { WeightUnit, Workout, WorkoutExercise, WorkoutSetId } from './workout.ts';

export function upNextSet(workout: Workout): WorkoutSetId | null {
  for (const exercise of workout.exercises) {
    const set = exercise.sets.find((candidate) => !candidate.done);

    if (set !== undefined) {
      return set.id;
    }
  }

  return null;
}

export function totalSets(workout: Workout): number {
  return workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
}

export function addEmptySet(exercise: WorkoutExercise, unit: WeightUnit, setId: WorkoutSetId): WorkoutExercise {
  return { ...exercise, sets: [...exercise.sets, { id: setId, reps: '', weight: '', unit, done: false }] };
}
