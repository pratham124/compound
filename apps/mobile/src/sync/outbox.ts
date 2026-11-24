import { SyncKey, type SyncRejection, type UserId } from '@compound/contracts';
import { z } from 'zod';

import type { LocalDatabase } from '../localDatabase/migrations.ts';

const OutboxRow = z.object({ key: SyncKey, kind: z.string(), item_id: z.string(), changed_at: z.number().int() })
  .transform(({ key, kind, item_id, changed_at }) => ({ key, kind, itemId: item_id, changedAt: changed_at }));

export type OutboxRow = z.infer<typeof OutboxRow>;

/** The signed-in person's outbox. Every read and write is limited to their rows, so one person's changes can't upload under another's session. */
export function createOutbox(db: LocalDatabase, userId: UserId) {
  return {
    async pending(limit: number): Promise<OutboxRow[]> {
      const rows = await db.getAllAsync('SELECT key, kind, item_id, changed_at FROM sync_outbox WHERE user_id = ? AND rejected_reason IS NULL ORDER BY key LIMIT ?', userId, limit);

      return z.array(OutboxRow).parse(rows);
    },

    async remove(key: SyncKey) {
      await db.runAsync('DELETE FROM sync_outbox WHERE user_id = ? AND key = ?', userId, key);
    },

    async reject(key: SyncKey, reason: SyncRejection, appVersion: string) {
      await db.runAsync('UPDATE sync_outbox SET rejected_reason = ?, rejected_app_version = ? WHERE user_id = ? AND key = ?', reason, appVersion, userId, key);
    },

    /** A new app version may fix what got a change rejected, so each rejected row is tried once more after an update. */
    async retryRejectedFromOtherVersions(appVersion: string) {
      await db.runAsync('UPDATE sync_outbox SET rejected_reason = NULL, rejected_app_version = NULL WHERE user_id = ? AND rejected_app_version IS NOT NULL AND rejected_app_version <> ?', userId, appVersion);
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
