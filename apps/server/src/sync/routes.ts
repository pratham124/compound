import { SyncBatchResults, SyncBatch, Unauthenticated, type UserId } from '@compound/contracts';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';

import { applyChanges } from './applyChanges.ts';
import type { RegisteredKind } from './kinds.ts';

export type SyncOptions = {
  apiPool: pg.Pool;
  signedInUserId: (request: FastifyRequest) => Promise<UserId | null>;
  kinds: readonly RegisteredKind[];
};

export const sync: FastifyPluginAsync<SyncOptions> = async (app, { apiPool, signedInUserId, kinds }) => {
  const registry = new Map(kinds.map((kind) => [kind.kind, kind]));

  if (registry.size !== kinds.length) {
    throw new Error('Two sync kinds share a name');
  }

  app.withTypeProvider<ZodTypeProvider>().post(
    '/sync/changes',
    { schema: { body: SyncBatch, response: { 200: SyncBatchResults, 401: Unauthenticated } } },
    async (request, reply) => {
      const userId = await signedInUserId(request);

      if (userId === null) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }

      return { results: await applyChanges({ pool: apiPool, userId, kinds: registry, log: request.log, changes: request.body.changes }) };
    },
  );
};
