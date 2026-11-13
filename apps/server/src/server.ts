import { z } from 'zod';

import { buildApp } from './app.ts';

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

const { PORT: port } = Env.parse(process.env);

const app = buildApp({ logger: true });

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
