import { HealthResponse } from '@compound/contracts';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import { checkHealth, type HealthChecks } from './health.ts';

export type BuildAppOptions = {
  logger: boolean;
  healthChecks: HealthChecks;
};

export function buildApp({ logger, healthChecks }: BuildAppOptions) {
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

  return app;
}
