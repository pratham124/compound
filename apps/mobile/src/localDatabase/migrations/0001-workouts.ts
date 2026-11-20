export const workoutMigration = {
  name: '0001-workouts',
  sql: `
    CREATE TABLE workouts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      finished_at INTEGER,
      body TEXT NOT NULL
    );
    CREATE UNIQUE INDEX one_active_workout_per_person ON workouts(user_id) WHERE finished_at IS NULL;
    CREATE TABLE workout_preferences (user_id TEXT PRIMARY KEY NOT NULL, unit TEXT NOT NULL CHECK (unit IN ('kg', 'lb')));
  `,
};
