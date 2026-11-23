import { UserId, type SyncChange } from '@compound/contracts';

import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { uuidv7 } from '../localDatabase/uuidv7.ts';
import { Workout } from '../workout/workout.ts';
import { createWorkoutStore } from '../workout/workoutStore.ts';
import { workoutSyncKind } from '../workout/workoutSyncKind.ts';
import { openTestDatabase } from '../workout/workoutTestDatabase.ts';
import type { SyncKind } from './kinds.ts';
import { createSyncRunner, type Upload } from './syncRunner.ts';

const person = UserId.parse('01930000-0000-7000-8000-00000000000a');
const noteId = '01930000-0000-7000-8000-0000000000aa';

// A kind that exists only in this test: its name and how to read an item. Queuing, batching, retries and
// idempotency keys come from the sync module unchanged.
function noteKind(notes: Map<string, string>): SyncKind {
  return {
    kind: 'note',
    load: async (_db, { itemId }) => {
      const text = notes.get(itemId);

      return text === undefined ? { status: 'gone' } : { status: 'ready', body: { text } };
    },
  };
}

it('a second kind queues and uploads beside workouts, by describing only its name and how to read an item', async () => {
  const { native, db } = openTestDatabase();
  const notes = new Map([[noteId, 'Squat felt heavy']]);
  const received: SyncChange[] = [];

  const upload: Upload = async (changes) => {
    received.push(...changes);

    return { status: 'uploaded', outcomes: changes.map(({ key }) => ({ key, outcome: 'applied' as const })) };
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind, noteKind(notes)], upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    await migrateLocalDatabase(db);
    await createWorkoutStore(db, person).save(Workout.parse({ id: '01930000-0000-7000-8000-000000000001', startedAt: 0, finishedAt: 60_000, exercises: [] }));
    const changedAt = Date.now();

    await db.runAsync('INSERT INTO sync_outbox (key, user_id, kind, item_id, changed_at) VALUES (?, ?, ?, ?, ?)', uuidv7(changedAt), person, 'note', noteId, changedAt);
    runner.kick();
    await runner.settled();

    expect(received.map(({ kind, itemId, body }) => ({ kind, itemId, body })).toSorted((a, b) => a.kind.localeCompare(b.kind))).toEqual([
      { kind: 'note', itemId: noteId, body: { text: 'Squat felt heavy' } },
      { kind: 'workout', itemId: '01930000-0000-7000-8000-000000000001', body: { startedAt: 0, finishedAt: 60_000, exercises: [] } },
    ]);
    expect(native.prepare('SELECT key FROM sync_outbox').all()).toEqual([]);
  } finally {
    runner.stop();
    native.close();
  }
});
