// Written by hand to match migrations/0004_workouts.sql. A migration that changes a column changes this file in the same commit.

export type WorkoutsTable = {
  user_id: string;
  id: string;
  started_at: Date;
  finished_at: Date;
};

export type WorkoutExercisesTable = {
  user_id: string;
  workout_id: string;
  id: string;
  position: number;
  exercise_id: string;
};

export type WorkoutSetsTable = {
  user_id: string;
  workout_exercise_id: string;
  id: string;
  position: number;
  reps: number;
  /** Numeric, so Postgres returns it as a string. Null is bodyweight. */
  weight: number | string | null;
  unit: 'kg' | 'lb';
};

export type WorkoutsDatabase = {
  workouts: WorkoutsTable;
  workout_exercises: WorkoutExercisesTable;
  workout_sets: WorkoutSetsTable;
};
