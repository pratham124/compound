import { HealthResponse } from '@compound/contracts';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

export type BuildAppOptions = {
  logger: boolean;
};

export function buildApp({ logger }: BuildAppOptions) {
  const app = Fastify({ logger });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.withTypeProvider<ZodTypeProvider>().get(
    '/health',
    { schema: { response: { 200: HealthResponse } } },
    async (): Promise<HealthResponse> => ({ status: 'ok' }),
  );

  return app;
}
