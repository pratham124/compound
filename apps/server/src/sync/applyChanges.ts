import { bodyRejection, UuidV7, type SyncChange, type SyncOutcome, type SyncRejection, type UserId } from '@compound/contracts';
import type pg from 'pg';
import { z } from 'zod';

import { withUser, type UserQuery } from '../identity/profileStore.ts';
import type { RegisteredKind } from './kinds.ts';

const ChangedAt = z.number().int().min(0).max(8_640_000_000_000_000);

/** A change stamped further ahead than this would win its item against every honest edit until the phone's clock caught up. */
export const MAX_CLOCK_AHEAD_MS = 5 * 60_000;

/**
 * Errors caused by the change's own data, which would fail the same way on every retry: class 22 (data exceptions,
 * such as a NUL byte or a number out of range) and class 23 (constraints). Anything else (a timeout, a deadlock, a
 * lost connection, a bug) fails the whole request so the phone keeps the change and tries again.
 */
const RejectedByData = z.object({
  code: z.string().regex(/^2[23]/),
  constraint: z.string().optional(),
}).transform(({ code, constraint }) => ({ reason: code.startsWith('23') ? 'conflict' as const : 'invalid-body' as const, code, constraint }));

export type SyncRejectionLog = { event: 'sync_change_rejected'; kind: string; reason: SyncRejection; pgCode?: string; constraint?: string };

/**
 * Where a rejected change is reported, since the phone shows no sync errors. Only the kind, the reason and, for a
 * database refusal, its SQLSTATE and constraint: never the body, the person or the database's message.
 */
export type SyncLogger = { warn: (fields: SyncRejectionLog, message: string) => void };

// Claims the item for this change only if it is newer than the stored winner, by (changedAt, key). The row lock it
// takes holds a concurrent change for the same item until this transaction ends, which then compares against the
// committed winner, so an older change can't overwrite a newer one even when both arrive at once.
const CLAIM = `insert into sync_versions (user_id, kind, item_id, changed_at, change_key)
  values ($1, $2, $3, $4, $5)
  on conflict (user_id, kind, item_id) do update
    set changed_at = excluded.changed_at, change_key = excluded.change_key
    where (sync_versions.changed_at, sync_versions.change_key) < (excluded.changed_at, excluded.change_key)
  returning 1`;

type ApplyOne = { query: UserQuery; userId: UserId; kinds: ReadonlyMap<string, RegisteredKind>; log: SyncLogger; change: SyncChange };

async function applyOne({ query, userId, kinds, log, change }: ApplyOne): Promise<SyncOutcome> {
  const { key } = change;

  function reject(reason: SyncRejection, database: { pgCode?: string; constraint?: string } = {}): SyncOutcome {
    log.warn({ event: 'sync_change_rejected', kind: change.kind, reason, ...database }, 'sync change rejected');

    return { key, outcome: 'rejected', reason };
  }

  const kind = kinds.get(change.kind);

  if (kind === undefined) {
    return reject('unknown-kind');
  }

  const itemId = UuidV7.safeParse(change.itemId);
  const changedAt = ChangedAt.safeParse(change.changedAt);

  if (!itemId.success || !changedAt.success) {
    return reject('invalid-change');
  }

  if (changedAt.data > Date.now() + MAX_CLOCK_AHEAD_MS) {
    return reject('clock');
  }

  const write = kind.change.safeParse(change.body);

  if (!write.success) {
    return reject(bodyRejection(write.error));
  }

  await query('savepoint sync_change');

  try {
    const claimed = await query(CLAIM, [userId, kind.kind, itemId.data, new Date(changedAt.data), key]);

    if (claimed.rowCount === 1) {
      await write.data(query, { userId, itemId: itemId.data });
    }

    await query('release savepoint sync_change');

    return { key, outcome: claimed.rowCount === 1 ? 'applied' : 'stale' };
  } catch (error) {
    const refusal = RejectedByData.safeParse(error);

    if (!refusal.success) {
      throw error;
    }

    await query('rollback to savepoint sync_change');

    const { reason, code, constraint } = refusal.data;

    return reject(reason, constraint === undefined ? { pgCode: code } : { pgCode: code, constraint });
  }
}

function byItem(a: SyncChange, b: SyncChange) {
  const left = `${a.kind}\u0000${a.itemId}`;
  const right = `${b.kind}\u0000${b.itemId}`;

  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Applies one upload in one transaction, each change on its own savepoint so a rejected change doesn't undo the others.
 * Changes are taken in item order, so two overlapping uploads lock their items in the same order and can't deadlock.
 */
export function applyChanges({ pool, userId, kinds, log, changes }: { pool: pg.Pool; userId: UserId; kinds: ReadonlyMap<string, RegisteredKind>; log: SyncLogger; changes: readonly SyncChange[] }) {
  return withUser(pool, userId, async (query) => {
    const outcomes: SyncOutcome[] = [];

    for (const change of [...changes].sort(byItem)) {
      outcomes.push(await applyOne({ query, userId, kinds, log, change }));
    }

    return outcomes;
  });
}
