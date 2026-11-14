import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  VALKEY_URL: z.string().min(1),
  SQS_ENDPOINT: z.string().min(1),
  SQS_REGION: z.string().min(1).default('us-east-1'),
  TICKS_QUEUE_NAME: z.string().min(1).default('ticks'),
});

export type Config = {
  port: number;
  databaseUrl: string;
  valkeyUrl: string;
  sqsEndpoint: string;
  sqsRegion: string;
  ticksQueueName: string;
};

export function parseConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = Env.parse(env);

  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    valkeyUrl: parsed.VALKEY_URL,
    sqsEndpoint: parsed.SQS_ENDPOINT,
    sqsRegion: parsed.SQS_REGION,
    ticksQueueName: parsed.TICKS_QUEUE_NAME,
  };
}
