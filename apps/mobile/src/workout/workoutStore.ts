import { UserId } from '@compound/contracts';
import { z } from 'zod';

import type { LocalDatabase } from '../localDatabase/migrations.ts';
import { WeightUnit, Workout, type WorkoutId } from './workout.ts';

const StoredWorkout = z.object({ body: z.string() });

export function createWorkoutStore(db: LocalDatabase, userId: UserId) {
  async function active() {
    const rows = await db.getAllAsync('SELECT body FROM workouts WHERE user_id = ? AND finished_at IS NULL', userId);

    return rows.length === 0 ? null : Workout.parse(JSON.parse(StoredWorkout.parse(rows[0]).body));
  }

  async function byId(id: WorkoutId) {
    const rows = await db.getAllAsync('SELECT body FROM workouts WHERE user_id = ? AND id = ?', userId, id);

    return rows.length === 0 ? null : Workout.parse(JSON.parse(StoredWorkout.parse(rows[0]).body));
  }

  async function save(workout: Workout) {
    await db.runAsync(
      'INSERT INTO workouts (id, user_id, finished_at, body) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET finished_at = excluded.finished_at, body = excluded.body WHERE workouts.user_id = excluded.user_id',
      workout.id, userId, workout.finishedAt, JSON.stringify(workout),
    );
  }

  async function unit() {
    return (await preference()).unit;
  }

  async function preference() {
    const rows = await db.getAllAsync('SELECT unit, revision FROM workout_preferences WHERE user_id = ?', userId);

    return rows.length === 0 ? { unit: WeightUnit.parse('kg'), revision: 0 } : z.object({ unit: WeightUnit, revision: z.number().int().nonnegative() }).parse(rows[0]);
  }

  async function refreshUnit(unit: WeightUnit, revision: number) {
    await db.runAsync('INSERT INTO workout_preferences (user_id, unit, revision) VALUES (?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET unit = excluded.unit, revision = workout_preferences.revision + 1 WHERE workout_preferences.revision = ?', userId, unit, revision);

    return await preference();
  }

  async function saveUnit(unit: WeightUnit) {
    await db.runAsync('INSERT INTO workout_preferences (user_id, unit, revision) VALUES (?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET unit = excluded.unit, revision = workout_preferences.revision + 1', userId, unit);
  }

  return { active, byId, save, unit, saveUnit, preference, refreshUnit };
}

export type WorkoutStore = ReturnType<typeof createWorkoutStore>;
