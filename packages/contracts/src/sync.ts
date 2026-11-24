import { z } from 'zod';

/** A lowercase RFC 9562 UUIDv7. Lowercase so that comparing keys as strings matches Postgres comparing them as uuids. */
export const UuidV7 = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

/** The idempotency key the phone gives a change once, when it is queued, and sends with every retry. */
export const SyncKey = UuidV7.brand<'SyncKey'>();

export type SyncKey = z.infer<typeof SyncKey>;

export const SYNC_BATCH_MAX_CHANGES = 20;

/** Kept well under Fastify's default 1 MiB body limit. */
export const SYNC_BATCH_MAX_BYTES = 512 * 1024;

// Only the envelope is checked for the whole request. The server checks itemId, changedAt and body per change,
// so one change it can't take is rejected on its own instead of failing the batch on every retry.
export const SyncChange = z.object({
  key: SyncKey,
  kind: z.string().min(1).max(40),
  itemId: z.string().max(64),
  changedAt: z.number(),
  body: z.unknown(),
});

export type SyncChange = z.infer<typeof SyncChange>;

export const SyncBatch = z.object({ changes: z.array(SyncChange).min(1).max(SYNC_BATCH_MAX_CHANGES) });

export type SyncBatch = z.infer<typeof SyncBatch>;

/** `too-large`: a list in the body is longer than its kind allows. `clock`: changedAt is further ahead of the server's clock than skew explains. */
export const SyncRejection = z.enum(['unknown-kind', 'invalid-change', 'invalid-body', 'too-large', 'clock', 'conflict']);

export type SyncRejection = z.infer<typeof SyncRejection>;

/** Why a kind's schema refused a body, the same on the phone and the server: `too-large` only when every issue is an over-long list. */
export function bodyRejection(error: z.ZodError): 'too-large' | 'invalid-body' {
  const tooLarge = error.issues.every((issue) => issue.code === 'too_big' && issue.origin === 'array');

  return error.issues.length > 0 && tooLarge ? 'too-large' : 'invalid-body';
}

export const SyncOutcome = z.discriminatedUnion('outcome', [
  z.object({ key: SyncKey, outcome: z.literal('applied') }),
  z.object({ key: SyncKey, outcome: z.literal('stale') }),
  z.object({ key: SyncKey, outcome: z.literal('rejected'), reason: SyncRejection }),
]);

export type SyncOutcome = z.infer<typeof SyncOutcome>;

export const SyncBatchResults = z.object({ results: z.array(SyncOutcome) });

export type SyncBatchResults = z.infer<typeof SyncBatchResults>;
