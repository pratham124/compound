import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  VALKEY_URL: z.string().min(1),
  SQS_ENDPOINT: z.string().min(1),
  SQS_REGION: z.string().min(1).default('us-east-1'),
  TICKS_QUEUE_NAME: z.string().min(1).default('ticks'),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  APPLE_APP_BUNDLE_ID: z.string().min(1).default('com.pratham124.compound'),
  SIGN_IN_MAILER: z.enum(['console']),
  NODE_ENV: z.string().optional(),
});

export type Config = {
  port: number;
  databaseUrl: string;
  valkeyUrl: string;
  sqsEndpoint: string;
  sqsRegion: string;
  ticksQueueName: string;
  authSecret: string;
  authBaseUrl: string;
  appleBundleId: string;
  signInMailer: 'console';
};

export function parseConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = Env.parse(env);

  if (parsed.NODE_ENV === 'production' && parsed.SIGN_IN_MAILER === 'console') {
    throw new Error('The console mailer prints sign-in codes, so it cannot run in production. Configure a real mailer.');
  }

  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    valkeyUrl: parsed.VALKEY_URL,
    sqsEndpoint: parsed.SQS_ENDPOINT,
    sqsRegion: parsed.SQS_REGION,
    ticksQueueName: parsed.TICKS_QUEUE_NAME,
    authSecret: parsed.BETTER_AUTH_SECRET,
    authBaseUrl: parsed.BETTER_AUTH_URL,
    appleBundleId: parsed.APPLE_APP_BUNDLE_ID,
    signInMailer: parsed.SIGN_IN_MAILER,
  };
}
