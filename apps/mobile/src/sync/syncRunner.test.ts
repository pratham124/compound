import { MAX_EXERCISES_PER_WORKOUT, SYNC_BATCH_MAX_BYTES, UserId, type SyncChange } from '@compound/contracts';

import { migrateLocalDatabase, type LocalDatabase } from '../localDatabase/migrations.ts';
import { uuidv7 } from '../localDatabase/uuidv7.ts';
import { Workout } from '../workout/workout.ts';
import { createWorkoutStore } from '../workout/workoutStore.ts';
import { workoutSyncKind } from '../workout/workoutSyncKind.ts';
import { openTestDatabase } from '../workout/workoutTestDatabase.ts';
import type { SyncKind } from './kinds.ts';
import { createSyncRunner, type Upload } from './syncRunner.ts';

const person = UserId.parse('01930000-0000-7000-8000-00000000000a');

const finished = Workout.parse({
  id: '01930000-0000-7000-8000-000000000001', startedAt: 1_000_000, finishedAt: 4_600_000,
  exercises: [{ id: '01930000-0000-7000-8000-000000000002', exerciseId: 'Barbell_Squat', sets: [
    { id: '01930000-0000-7000-8000-000000000003', reps: '5', weight: '102,5', unit: 'kg', done: true },
    { id: '01930000-0000-7000-8000-000000000004', reps: '5', weight: '', unit: 'kg', done: true },
    { id: '01930000-0000-7000-8000-000000000005', reps: '3', weight: '110', unit: 'kg', done: false },
  ] }],
});

function onlineEvents() {
  const listeners = new Set<() => void>();

  return {
    wakeUp: (kick: () => void) => {
      listeners.add(kick);

      return () => listeners.delete(kick);
    },
    comeOnline: () => {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

function acceptingServer() {
  const received: SyncChange[] = [];

  const upload: Upload = async (changes) => {
    received.push(...changes);

    return { status: 'uploaded', outcomes: changes.map(({ key }) => ({ key, outcome: 'applied' as const })) };
  };

  return { received, upload };
}

/** Queues a row the way the workout triggers do, for kinds that exist only in this test. */
async function queueRow(db: LocalDatabase, row: { userId: UserId; kind: string; itemId: string; changedAt: number }) {
  await db.runAsync('INSERT INTO sync_outbox (key, user_id, kind, item_id, changed_at) VALUES (?, ?, ?, ?, ?)', uuidv7(row.changedAt), row.userId, row.kind, row.itemId, row.changedAt);
}

function pause(ms: number) {
  return new Promise<void>((resolve) => { setTimeout(() => resolve(), ms); });
}

async function migratedDatabase() {
  const opened = openTestDatabase();

  await migrateLocalDatabase(opened.db);

  return opened;
}

it('a workout finished offline uploads by itself when the phone comes back online', async () => {
  const { native, db } = await migratedDatabase();
  const network = onlineEvents();
  const server = acceptingServer();
  let online = false;

  const upload: Upload = async (changes, signal) => {
    if (!online) {
      throw new TypeError('Network request failed');
    }

    return server.upload(changes, signal);
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload, appVersion: '1.0.0', wakeUps: [network.wakeUp] });

  try {
    await createWorkoutStore(db, person).save(finished);
    runner.kick();
    await runner.settled();
    expect(server.received).toEqual([]);

    online = true;
    network.comeOnline();
    await runner.settled();

    expect(server.received).toEqual([expect.objectContaining({
      kind: 'workout',
      itemId: finished.id,
      body: {
        startedAt: 1_000_000,
        finishedAt: 4_600_000,
        exercises: [{ id: '01930000-0000-7000-8000-000000000002', exerciseId: 'Barbell_Squat', sets: [
          { id: '01930000-0000-7000-8000-000000000003', reps: 5, weight: 102.5, unit: 'kg' },
          { id: '01930000-0000-7000-8000-000000000004', reps: 5, weight: null, unit: 'kg' },
        ] }],
      },
    })]);
    expect(native.prepare('SELECT key FROM sync_outbox').all()).toEqual([]);
  } finally {
    runner.stop();
    native.close();
  }
});

const otherPerson = UserId.parse('01930000-0000-7000-8000-00000000000b');

function finishedWorkout(n: number) {
  const hex = n.toString(16).padStart(4, '0');

  return Workout.parse({
    id: `01930000-${hex}-7000-8000-000000000001`, startedAt: 1_000_000, finishedAt: 4_600_000,
    exercises: [{ id: `01930000-${hex}-7000-8000-000000000002`, exerciseId: 'Pushups', sets: [] }],
  });
}

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => { resolve = done; });

  return { promise, resolve };
}

it("sends only the signed-in person's queued changes", async () => {
  const { native, db } = await migratedDatabase();
  const server = acceptingServer();
  const runner = createSyncRunner({ db, userId: otherPerson, kinds: [workoutSyncKind], upload: server.upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    await createWorkoutStore(db, otherPerson).save(finishedWorkout(2));
    runner.kick();
    await runner.settled();

    expect(server.received.map(({ itemId }) => itemId)).toEqual([finishedWorkout(2).id]);
    expect(native.prepare('SELECT user_id FROM sync_outbox').all()).toEqual([{ user_id: person }]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('a kick that arrives while the outbox is being read runs another pass, so the new change is not left waiting', async () => {
  const { native, db } = await migratedDatabase();
  const server = acceptingServer();
  let duringFirstRead: (() => Promise<void>) | null = null;

  // The first read of the outbox finds it empty; a workout is finished, and the runner kicked, before that read returns.
  const racingDb: LocalDatabase = {
    ...db,
    getAllAsync: async (sql, ...params) => {
      const rows = await db.getAllAsync(sql, ...params);
      const hook = duringFirstRead;

      if (hook !== null && sql.includes('FROM sync_outbox')) {
        duringFirstRead = null;
        await hook();
      }

      return rows;
    },
  };

  const runner = createSyncRunner({ db: racingDb, userId: person, kinds: [workoutSyncKind], upload: server.upload, appVersion: '1.0.0', wakeUps: [] });

  duringFirstRead = async () => {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    runner.kick();
  };

  try {
    runner.kick();
    await runner.settled();

    expect(server.received.map(({ itemId }) => itemId)).toEqual([finishedWorkout(1).id]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('stopping during an upload, as signing out does, keeps its changes queued even if the server answers', async () => {
  const { native, db } = await migratedDatabase();
  const answer = deferred();
  const uploadStarted = deferred();
  let aborted = false;

  const upload: Upload = async (changes, signal) => {
    signal.addEventListener('abort', () => { aborted = true; });
    uploadStarted.resolve();
    await answer.promise;

    return { status: 'uploaded', outcomes: changes.map(({ key }) => ({ key, outcome: 'applied' as const })) };
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    runner.kick();
    await uploadStarted.promise;
    runner.stop();
    answer.resolve();
    await runner.settled();

    expect(aborted).toBe(true);
    expect(native.prepare('SELECT item_id FROM sync_outbox').all()).toEqual([{ item_id: finishedWorkout(1).id }]);
  } finally {
    native.close();
  }
});

it('a failed upload is tried again by itself after a delay', async () => {
  const { native, db } = await migratedDatabase();
  const server = acceptingServer();
  const retried = deferred();
  let attempts = 0;

  const upload: Upload = async (changes, signal) => {
    attempts += 1;

    if (attempts === 1) {
      throw new Error('The server answered 503');
    }

    const result = await server.upload(changes, signal);

    retried.resolve();

    return result;
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload, appVersion: '1.0.0', wakeUps: [], retryDelaysMs: [10] });

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    runner.kick();
    await retried.promise;
    await runner.settled();

    expect(server.received.map(({ itemId }) => itemId)).toEqual([finishedWorkout(1).id]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('a rejected change stays on the phone with its reason, and is tried once more after an app update', async () => {
  const { native, db } = await migratedDatabase();
  const sent: string[] = [];

  const rejectingUpload: Upload = async (changes) => {
    sent.push(...changes.map(({ itemId }) => itemId));

    return { status: 'uploaded', outcomes: changes.map(({ key }) => ({ key, outcome: 'rejected' as const, reason: 'conflict' as const })) };
  };

  async function syncOnce(appVersion: string) {
    const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload: rejectingUpload, appVersion, wakeUps: [] });

    runner.kick();
    await runner.settled();
    runner.stop();
  }

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    await syncOnce('1.0.0');
    await syncOnce('1.0.0');
    expect(native.prepare('SELECT rejected_reason, rejected_app_version FROM sync_outbox').all()).toEqual([{ rejected_reason: 'conflict', rejected_app_version: '1.0.0' }]);

    await syncOnce('1.1.0');
    await syncOnce('1.1.0');

    expect(sent).toEqual([finishedWorkout(1).id, finishedWorkout(1).id]);
    expect(native.prepare('SELECT rejected_reason, rejected_app_version FROM sync_outbox').all()).toEqual([{ rejected_reason: 'conflict', rejected_app_version: '1.1.0' }]);
  } finally {
    native.close();
  }
});

it('coming back online while a failing upload is still in flight uploads straight after it, not after the backoff', async () => {
  const { native, db } = await migratedDatabase();
  const network = onlineEvents();
  const server = acceptingServer();
  const firstAttempt = deferred();
  const firstStarted = deferred();
  let attempts = 0;

  const upload: Upload = async (changes, signal) => {
    attempts += 1;

    if (attempts === 1) {
      firstStarted.resolve();
      await firstAttempt.promise;
      throw new TypeError('Network request failed');
    }

    return server.upload(changes, signal);
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload, appVersion: '1.0.0', wakeUps: [network.wakeUp], retryDelaysMs: [60_000] });

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    runner.kick();
    await firstStarted.promise;
    network.comeOnline();
    firstAttempt.resolve();
    await runner.settled();

    expect(server.received.map(({ itemId }) => itemId)).toEqual([finishedWorkout(1).id]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('queued changes too big for one upload go up in several, each under the byte cap, and all arrive', async () => {
  const { native, db } = await migratedDatabase();
  const batches: SyncChange[][] = [];
  const bigText = 'x'.repeat(200 * 1024);

  const bigKind: SyncKind = { kind: 'big', load: async () => ({ status: 'ready', body: { text: bigText } }) };

  const upload: Upload = async (changes) => {
    batches.push(changes);

    return { status: 'uploaded', outcomes: changes.map(({ key }) => ({ key, outcome: 'applied' as const })) };
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [bigKind], upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    for (let n = 1; n <= 4; n += 1) {
      await queueRow(db, { userId: person, kind: 'big', itemId: finishedWorkout(n).id, changedAt: n });
    }

    runner.kick();
    await runner.settled();

    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((batch) => JSON.stringify({ changes: batch }).length <= SYNC_BATCH_MAX_BYTES)).toBe(true);
    expect(batches.flat()).toHaveLength(4);
  } finally {
    runner.stop();
    native.close();
  }
});

it('a server answer that settles none of the batch fails the pass and waits for the retry instead of asking again at once', async () => {
  const { native, db } = await migratedDatabase();
  let asked = 0;

  const upload: Upload = async (changes) => {
    asked += 1;

    return asked === 1
      ? { status: 'uploaded', outcomes: [] }
      : { status: 'uploaded', outcomes: changes.map(({ key }) => ({ key, outcome: 'applied' as const })) };
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload, appVersion: '1.0.0', wakeUps: [], retryDelaysMs: [60_000] });

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    runner.kick();
    await runner.settled();

    expect(asked).toBe(1);
    expect(native.prepare('SELECT item_id FROM sync_outbox').all()).toEqual([{ item_id: finishedWorkout(1).id }]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('an item its kind reads as invalid stays queued as rejected and is never sent; an item that is gone is dropped unsent', async () => {
  const { native, db } = await migratedDatabase();
  const server = acceptingServer();
  const [invalidId, goneId] = [finishedWorkout(1).id, finishedWorkout(2).id];

  const checked: SyncKind = {
    kind: 'checked',
    load: async (_db, { itemId }) => (itemId === invalidId ? { status: 'invalid', reason: 'invalid-body' } : { status: 'gone' }),
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [checked], upload: server.upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    await queueRow(db, { userId: person, kind: 'checked', itemId: invalidId, changedAt: 1 });
    await queueRow(db, { userId: person, kind: 'checked', itemId: goneId, changedAt: 2 });
    runner.kick();
    await runner.settled();

    expect(server.received).toEqual([]);
    expect(native.prepare('SELECT item_id, rejected_reason FROM sync_outbox').all()).toEqual([{ item_id: invalidId, rejected_reason: 'invalid-body' }]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('a workout with more exercises than the server takes stays queued as rejected too-large, and the next workout still uploads', async () => {
  const { native, db } = await migratedDatabase();
  const server = acceptingServer();

  const tooMany = Workout.parse({
    ...finishedWorkout(1),
    exercises: Array.from({ length: MAX_EXERCISES_PER_WORKOUT + 1 }, (_, n) => ({ id: `01930000-0001-7000-8000-${n.toString(16).padStart(12, '0')}`, exerciseId: 'Pushups', sets: [] })),
  });

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload: server.upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    await createWorkoutStore(db, person).save(tooMany);
    await createWorkoutStore(db, person).save(finishedWorkout(2));
    runner.kick();
    await runner.settled();

    expect(server.received.map(({ itemId }) => itemId)).toEqual([finishedWorkout(2).id]);
    expect(native.prepare('SELECT item_id, rejected_reason FROM sync_outbox').all()).toEqual([{ item_id: tooMany.id, rejected_reason: 'too-large' }]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('a 401 keeps the rows queued and schedules no retry while signed out', async () => {
  const { native, db } = await migratedDatabase();
  let asked = 0;

  const upload: Upload = async () => {
    asked += 1;

    return { status: 'unauthenticated' };
  };

  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload, appVersion: '1.0.0', wakeUps: [], retryDelaysMs: [10] });

  try {
    await createWorkoutStore(db, person).save(finishedWorkout(1));
    runner.kick();
    await runner.settled();
    await pause(100);
    await runner.settled();

    expect(asked).toBe(1);
    expect(native.prepare('SELECT item_id, rejected_reason FROM sync_outbox').all()).toEqual([{ item_id: finishedWorkout(1).id, rejected_reason: null }]);
  } finally {
    runner.stop();
    native.close();
  }
});

it('a queued row of a kind this build does not know is kept rejected unknown-kind without being sent, and the rest still upload', async () => {
  const { native, db } = await migratedDatabase();
  const server = acceptingServer();
  const runner = createSyncRunner({ db, userId: person, kinds: [workoutSyncKind], upload: server.upload, appVersion: '1.0.0', wakeUps: [] });

  try {
    await queueRow(db, { userId: person, kind: 'routine', itemId: finishedWorkout(1).id, changedAt: 1 });
    await createWorkoutStore(db, person).save(finishedWorkout(2));
    runner.kick();
    await runner.settled();

    expect(server.received.map(({ itemId }) => itemId)).toEqual([finishedWorkout(2).id]);
    expect(native.prepare('SELECT kind, rejected_reason FROM sync_outbox').all()).toEqual([{ kind: 'routine', rejected_reason: 'unknown-kind' }]);
  } finally {
    runner.stop();
    native.close();
  }
});
