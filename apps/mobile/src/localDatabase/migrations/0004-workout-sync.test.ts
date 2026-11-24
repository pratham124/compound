import { SyncKey } from '@compound/contracts';
import { z } from 'zod';

import { openTestDatabase } from '../../workout/workoutTestDatabase.ts';
import { migrateLocalDatabase, migrations } from '../migrations.ts';

const person = '01930000-0000-7000-8000-00000000000a';

it('queues, once, the workouts that were already finished before the update, and not the one in progress', async () => {
  const { native, db } = openTestDatabase();

  try {
    await migrateLocalDatabase(db, migrations.slice(0, 2));
    native.exec(`
      INSERT INTO workouts (id, user_id, finished_at, body) VALUES ('01930000-0000-7000-8000-000000000001', '${person}', 1731000000123, '{}');
      INSERT INTO workouts (id, user_id, finished_at, body) VALUES ('01930000-0000-7000-8000-000000000002', '${person}', NULL, '{}');
    `);

    await migrateLocalDatabase(db);
    await migrateLocalDatabase(db);

    const rows = native.prepare('SELECT key, user_id, kind, item_id, changed_at FROM sync_outbox').all();

    expect(rows).toEqual([{ key: expect.any(String), user_id: person, kind: 'workout', item_id: '01930000-0000-7000-8000-000000000001', changed_at: 1731000000123 }]);
    expect(z.array(z.object({ key: SyncKey })).safeParse(rows).success).toBe(true);
  } finally {
    native.close();
  }
});

it('queues a workout when it is saved finished, and not while it is in progress', async () => {
  const { native, db } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    native.exec(`INSERT INTO workouts (id, user_id, finished_at, body) VALUES ('01930000-0000-7000-8000-000000000001', '${person}', NULL, '{}')`);
    native.exec("UPDATE workouts SET body = '{\"edited\":true}'");
    expect(native.prepare('SELECT item_id FROM sync_outbox').all()).toEqual([]);

    native.exec('UPDATE workouts SET finished_at = 1731000000123');

    expect(native.prepare('SELECT item_id FROM sync_outbox').all()).toEqual([{ item_id: '01930000-0000-7000-8000-000000000001' }]);
  } finally {
    native.close();
  }
});
