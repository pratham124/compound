import { HealthResponse } from '@compound/contracts';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import { checkHealth, type HealthChecks } from './health.ts';
import type { Auth } from './identity/auth.ts';
import { identity } from './identity/routes.ts';

export type BuildAppOptions = {
  logger: boolean;
  healthChecks: HealthChecks;
  auth: Auth;
};

export function buildApp({ logger, healthChecks, auth }: BuildAppOptions) {
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

  void app.register(identity, { auth });

  return app;
}
