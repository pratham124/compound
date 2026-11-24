import { SYNC_BATCH_MAX_BYTES, SYNC_BATCH_MAX_CHANGES, type SyncChange, type SyncOutcome, type UserId } from '@compound/contracts';

import type { LocalDatabase } from '../localDatabase/migrations.ts';
import type { SyncKind } from './kinds.ts';
import { createOutbox, type OutboxRow } from './outbox.ts';

export type UploadResult = { status: 'uploaded'; outcomes: SyncOutcome[] } | { status: 'unauthenticated' };

/** Sends one batch. Throws when the change may not have reached the server (offline, a timeout, a 5xx), so the rows stay. */
export type Upload = (changes: SyncChange[], signal: AbortSignal) => Promise<UploadResult>;

/** Something that can tell the runner to try now, such as the phone coming back online. Returns its unsubscribe. */
export type WakeUp = (kick: () => void) => () => void;

export type SyncRunnerOptions = {
  db: LocalDatabase;
  userId: UserId;
  kinds: readonly SyncKind[];
  upload: Upload;
  appVersion: string;
  wakeUps: readonly WakeUp[];
  retryDelaysMs?: readonly number[];
};

type PassResult = 'done' | 'failed' | 'unauthenticated' | 'stopped';

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000, 300_000];

function utf8Length(text: string) {
  let bytes = 0;

  for (const character of text) {
    const point = character.codePointAt(0) ?? 0;

    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }

  return bytes;
}

/**
 * Uploads one person's outbox, one batch at a time, until it is empty. One pass runs at a time; a kick during a pass
 * runs another pass after it, so a change queued mid-upload isn't left for the next wake-up. A failed pass retries
 * with backoff. `stop` (sign-out or an account switch) aborts the upload in flight and leaves its rows queued.
 */
export function createSyncRunner({ db, userId, kinds, upload, appVersion, wakeUps, retryDelaysMs = RETRY_DELAYS_MS }: SyncRunnerOptions) {
  const outbox = createOutbox(db, userId);
  const byKind = new Map(kinds.map((kind) => [kind.kind, kind]));
  let running: Promise<void> | null = null;
  let again = false;
  let stopped = false;
  let failures = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: AbortController | null = null;
  let retriedRejected = false;

  async function batchFrom(rows: OutboxRow[]) {
    const batch: SyncChange[] = [];
    let bytes = 0;

    for (const row of rows) {
      const kind = byKind.get(row.kind);

      if (kind === undefined) {
        await outbox.reject(row.key, 'unknown-kind', appVersion);
        continue;
      }

      const loaded = await kind.load(db, { userId, itemId: row.itemId });

      switch (loaded.status) {
        case 'gone':
          await outbox.remove(row.key);
          break;
        case 'invalid':
          await outbox.reject(row.key, loaded.reason, appVersion);
          break;
        case 'ready': {
          const change: SyncChange = { key: row.key, kind: row.kind, itemId: row.itemId, changedAt: row.changedAt, body: loaded.body };
          const size = utf8Length(JSON.stringify(change));

          if (batch.length > 0 && bytes + size > SYNC_BATCH_MAX_BYTES) {
            return batch;
          }

          batch.push(change);
          bytes += size;
          break;
        }

        default: {
          const _exhaustive: never = loaded;

          return _exhaustive;
        }
      }
    }

    return batch;
  }

  async function settle(outcomes: readonly SyncOutcome[]) {
    for (const outcome of outcomes) {
      switch (outcome.outcome) {
        case 'applied':
        case 'stale':
          await outbox.remove(outcome.key);
          break;
        case 'rejected':
          await outbox.reject(outcome.key, outcome.reason, appVersion);
          break;
        default: {
          const _exhaustive: never = outcome;

          return _exhaustive;
        }
      }
    }
  }

  async function pass(): Promise<PassResult> {
    if (!retriedRejected) {
      await outbox.retryRejectedFromOtherVersions(appVersion);
      retriedRejected = true;
    }

    for (;;) {
      const rows = await outbox.pending(SYNC_BATCH_MAX_CHANGES);

      if (stopped) {
        return 'stopped';
      }

      if (rows.length === 0) {
        return 'done';
      }

      const batch = await batchFrom(rows);

      if (batch.length === 0) {
        continue;
      }

      const controller = new AbortController();

      inFlight = controller;

      const result = await upload(batch, controller.signal).finally(() => { inFlight = null; });

      if (stopped) {
        return 'stopped';
      }

      if (result.status === 'unauthenticated') {
        return 'unauthenticated';
      }

      await settle(result.outcomes);

      // A server that answered without settling anything would otherwise be asked the same batch forever.
      if (!result.outcomes.some((outcome) => batch.some((change) => change.key === outcome.key))) {
        return 'failed';
      }
    }
  }

  function scheduleRetry() {
    const delay = retryDelaysMs[Math.min(failures, retryDelaysMs.length - 1)] ?? 0;

    failures += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      start();
    }, delay);
  }

  async function run() {
    let result: PassResult;

    // A kick during a failed pass is news (the network came back), so it is tried now rather than after the backoff.
    do {
      again = false;
      result = await pass().catch((): PassResult => (stopped ? 'stopped' : 'failed'));
    } while (again && (result === 'done' || result === 'failed'));

    running = null;

    if (result === 'done') {
      failures = 0;
    } else if (result === 'failed') {
      scheduleRetry();
    }
  }

  /** A wake-up from outside (back online, a finish, the app in front) starts over from the shortest retry delay. */
  function kick() {
    failures = 0;
    start();
  }

  function start() {
    if (stopped) {
      return;
    }

    if (running !== null) {
      again = true;

      return;
    }

    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    running = run();
  }

  const unsubscribes = wakeUps.map((wakeUp) => wakeUp(kick));

  return {
    kick,
    /** Resolves when the pass running now (if any) has finished. */
    settled: () => running ?? Promise.resolve(),
    stop() {
      stopped = true;
      inFlight?.abort();

      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }

      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    },
  };
}

export type SyncRunner = ReturnType<typeof createSyncRunner>;
