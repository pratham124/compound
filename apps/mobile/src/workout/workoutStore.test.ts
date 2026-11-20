import { UserId } from '@compound/contracts';

import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { Workout } from './workout.ts';
import { createWorkoutStore } from './workoutStore.ts';
import { openTestDatabase } from './workoutTestDatabase.ts';

const person = UserId.parse('00000000-0000-4000-8000-000000000001');
const other = UserId.parse('00000000-0000-4000-8000-000000000002');

const workout = Workout.parse({
  id: '00000000-0000-4000-8000-000000000003', startedAt: 1000, finishedAt: null,
  exercises: [{ id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [
    { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '', unit: 'lb', done: true },
  ] }],
});

it('persists an account-owned weightless workout, restores its draft and atomically finishes it', async () => {
  const { native, db } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const first = createWorkoutStore(db, person);

    await first.save(workout);
    const reopened = createWorkoutStore(db, person);

    expect(await reopened.active()).toEqual(workout);
    expect(await createWorkoutStore(db, other).active()).toBeNull();
    expect(await createWorkoutStore(db, other).byId(workout.id)).toBeNull();
    const finished = { ...workout, finishedAt: 6000 };

    await reopened.save(finished);
    expect(await reopened.active()).toBeNull();
    expect(await createWorkoutStore(db, person).byId(workout.id)).toEqual(finished);
  } finally {
    native.close();
  }
});

it('applies each named migration once, and rolls back a failed later migration', async () => {
  const { native, db } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    await migrateLocalDatabase(db);
    await expect(migrateLocalDatabase(db, [{ name: 'later', sql: 'CREATE TABLE later (id TEXT); INVALID SQL;' }])).rejects.toThrow();
    expect(native.prepare("SELECT name FROM sqlite_master WHERE name = 'later'").all()).toEqual([]);
    await migrateLocalDatabase(db, [{ name: 'later', sql: 'CREATE TABLE later (id TEXT);' }]);
    expect(native.prepare('SELECT name FROM local_migrations ORDER BY name').all()).toEqual([{ name: '0001-workouts' }, { name: '0002-workout-preference-revision' }, { name: 'later' }]);
  } finally {
    native.close();
  }
});

it('remembers display units per person after the store is recreated', async () => {
  const { native, db } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    await createWorkoutStore(db, person).saveUnit('lb');
    expect(await createWorkoutStore(db, person).unit()).toBe('lb');
    expect(await createWorkoutStore(db, other).unit()).toBe('kg');
  } finally {
    native.close();
  }
});
