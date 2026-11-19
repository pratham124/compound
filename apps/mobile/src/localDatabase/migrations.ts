import { z } from 'zod';

import { workoutMigration } from './migrations/0001-workouts.ts';
import { workoutPreferenceRevisionMigration } from './migrations/0002-workout-preference-revision.ts';

export type LocalDatabase = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...params: (string | number | null)[]) => Promise<{ changes: number }>;
  getAllAsync: (sql: string, ...params: (string | number | null)[]) => Promise<object[]>;
};

export type LocalMigration = { name: string; sql: string };

export const migrations: readonly LocalMigration[] = [workoutMigration, workoutPreferenceRevisionMigration];

export async function migrateLocalDatabase(db: LocalDatabase, steps = migrations) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY NOT NULL);');

  for (const migration of steps) {
    await db.execAsync('BEGIN IMMEDIATE');

    try {
      const applied = await db.getAllAsync('SELECT name FROM local_migrations WHERE name = ?', migration.name);

      if (applied.length === 0) {
        await db.execAsync(migration.sql);
        await db.runAsync('INSERT INTO local_migrations (name) VALUES (?)', migration.name);
      } else {
        z.array(z.object({ name: z.string() })).parse(applied);
      }

      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }
}
