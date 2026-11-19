export const workoutPreferenceRevisionMigration = {
  name: '0002-workout-preference-revision',
  sql: 'ALTER TABLE workout_preferences ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;',
};
