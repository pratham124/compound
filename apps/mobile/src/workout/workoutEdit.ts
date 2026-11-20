import { validSet, type WeightUnit, type Workout, type WorkoutExerciseId, type WorkoutSet, type WorkoutSetId } from './workout.ts';
import { addEmptySet } from './workoutProgress.ts';

export type SetTarget = { exerciseId: WorkoutExerciseId; setId: WorkoutSetId };

export type WorkoutEdit =
  | { kind: 'reps'; target: SetTarget; reps: string }
  | { kind: 'weight'; target: SetTarget; weight: string; unit: WeightUnit }
  | { kind: 'done'; target: SetTarget; done: boolean }
  | { kind: 'add-set'; exerciseId: WorkoutExerciseId; setId: WorkoutSetId; unit: WeightUnit };

/** Applies one edit to the given workout by card and set ID; null when its card or set is gone or the edit changes nothing. */
export function applyWorkoutEdit(workout: Workout, edit: WorkoutEdit): Workout | null {
  switch (edit.kind) {
    case 'reps':
      return updateSet(workout, edit.target, (set) => ({ ...set, reps: edit.reps }));
    case 'weight':
      return updateSet(workout, edit.target, (set) => ({ ...set, weight: edit.weight, unit: edit.unit }));
    case 'done':
      return updateSet(workout, edit.target, (set) => edit.done && !validSet(set) ? set : { ...set, done: edit.done });
    case 'add-set': {
      const exercise = workout.exercises.find((item) => item.id === edit.exerciseId);

      if (exercise === undefined) {
        return null;
      }

      const added = addEmptySet(exercise, edit.unit, edit.setId);

      return { ...workout, exercises: workout.exercises.map((item) => item === exercise ? added : item) };
    }

    default: {
      const _exhaustive: never = edit;

      return _exhaustive;
    }
  }
}

function updateSet(workout: Workout, target: SetTarget, update: (set: WorkoutSet) => WorkoutSet): Workout | null {
  const exercise = workout.exercises.find((item) => item.id === target.exerciseId);
  const set = exercise?.sets.find((item) => item.id === target.setId);

  if (exercise === undefined || set === undefined) {
    return null;
  }

  const updated = update(set);

  if (updated === set) {
    return null;
  }

  return {
    ...workout,
    exercises: workout.exercises.map((item) => item === exercise ? { ...item, sets: item.sets.map((candidate) => candidate === set ? updated : candidate) } : item),
  };
}
