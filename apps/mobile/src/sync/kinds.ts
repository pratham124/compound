import type { UserId } from '@compound/contracts';

import type { LocalDatabase } from '../localDatabase/migrations.ts';

export type LoadedItem = { status: 'ready'; body: unknown } | { status: 'gone' } | { status: 'invalid'; reason: 'invalid-body' | 'too-large' };

/**
 * What a feature describes to make one kind of item syncable: its name, and how to read an item's body as it is now
 * when its outbox row uploads. The outbox, the upload and idempotency are the sync module's, and a kind never
 * touches them. `gone` drops the row (the item no longer exists to send); `invalid` keeps it, rejected with its reason, without sending.
 */
export type SyncKind = {
  kind: string;
  load: (db: LocalDatabase, item: { userId: UserId; itemId: string }) => Promise<LoadedItem>;
};
