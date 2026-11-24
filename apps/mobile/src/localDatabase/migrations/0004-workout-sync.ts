import { SYNC_KIND_WORKOUT } from '@compound/contracts';

// A UUIDv7 idempotency key for a change at `t` (milliseconds), built in SQL so that a finished workout and its outbox
// row are written by the same statement and a crash can't leave one without the other. `random() & n` rather than
// abs(random()), which overflows on the smallest integer.
function keyAt(t: string) {
  return `printf('%08x-%04x-7%03x-%x%03x-%012x', ${t} >> 16, ${t} & 65535, random() & 4095, 8 + (random() & 3), random() & 4095, random() & 281474976710655)`;
}

const NOW_MS = "CAST(unixepoch('subsec') * 1000 AS INTEGER)";

function enqueueFinished(event: 'INSERT' | 'UPDATE') {
  return `
    CREATE TRIGGER workout_finished_${event.toLowerCase()} AFTER ${event} ON workouts WHEN NEW.finished_at IS NOT NULL
    BEGIN
      INSERT INTO sync_outbox (key, user_id, kind, item_id, changed_at)
        SELECT ${keyAt('now.t')}, NEW.user_id, '${SYNC_KIND_WORKOUT}', NEW.id, now.t FROM (SELECT ${NOW_MS} AS t) AS now;
    END;`;
}

export const workoutSyncMigration = {
  name: '0004-workout-sync',
  sql: `
    ${enqueueFinished('INSERT')}
    ${enqueueFinished('UPDATE')}
    INSERT INTO sync_outbox (key, user_id, kind, item_id, changed_at)
      SELECT ${keyAt('finished_at')}, user_id, '${SYNC_KIND_WORKOUT}', id, finished_at FROM workouts WHERE finished_at IS NOT NULL;
  `,
};
