import type { Workout, WorkoutExerciseId, WorkoutSetId } from './workout.ts';

export type WorkoutRemoval = { kind: 'exercise'; exerciseId: WorkoutExerciseId } | { kind: 'set'; exerciseId: WorkoutExerciseId; setId: WorkoutSetId };

export function removeWorkoutItem(workout: Workout, removal: WorkoutRemoval): Workout | null {
  const exercise = workout.exercises.find((item) => item.id === removal.exerciseId);

  if (exercise === undefined) {
    return null;
  }

  if (removal.kind === 'exercise') {
    return { ...workout, exercises: workout.exercises.filter((item) => item.id !== removal.exerciseId) };
  }

  const sets = exercise.sets.filter((set) => set.id !== removal.setId);

  if (sets.length === exercise.sets.length) {
    return null;
  }

  return { ...workout, exercises: workout.exercises.map((item) => item.id === exercise.id ? { ...item, sets } : item) };
}
