import { HealthResponse } from '@compound/contracts';
import Fastify, { type FastifyRequest } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';

import { checkHealth, type HealthChecks } from './health.ts';
import type { Auth } from './identity/auth.ts';
import { identity, signedInUserId } from './identity/routes.ts';
import type { RegisteredKind } from './sync/kinds.ts';
import { sync } from './sync/routes.ts';
import { workouts } from './workouts/routes.ts';
import { workoutKind } from './workouts/workoutStore.ts';

export const SYNC_KINDS: readonly RegisteredKind[] = [workoutKind];

export type BuildAppOptions = {
  logger: boolean;
  healthChecks: HealthChecks;
  auth: Auth;
  apiPool: pg.Pool;
  syncKinds: readonly RegisteredKind[];
};

export function buildApp({ logger, healthChecks, auth, apiPool, syncKinds }: BuildAppOptions) {
  const app = Fastify({ logger });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    { schema: { response: { 200: HealthResponse, 503: HealthResponse } } },
    async (_request, reply): Promise<HealthResponse> => {
      const health = await checkHealth(healthChecks);

      return reply.code(health.status === 'ok' ? 200 : 503).send(health);
    },
  );

  const signedIn = (request: FastifyRequest) => signedInUserId(auth, request);

  void app.register(identity, { auth, apiPool });
  void app.register(sync, { apiPool, signedInUserId: signedIn, kinds: syncKinds });
  void app.register(workouts, { apiPool, signedInUserId: signedIn });

  return app;
}
