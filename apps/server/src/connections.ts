import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Redis } from 'ioredis';
import pg from 'pg';

import type { Config } from './config.ts';
import type { HealthChecks } from './health.ts';

const TIMEOUT_MS = 2000;

export type Connections = {
  pool: pg.Pool;
  valkey: Redis;
  sqs: SQSClient;
  ticksQueueUrl: string;
  healthChecks: HealthChecks;
  close: () => Promise<void>;
};

export function connect(config: Config): Connections {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: TIMEOUT_MS,
    query_timeout: TIMEOUT_MS,
  });

  // Without a listener, an error on an idle pooled connection crashes the process.
  pool.on('error', () => {});

  // The offline queue stays on so a check sent before the socket is ready waits for it; commandTimeout
  // still bounds the wait, so a down Valkey shows up as "down" instead of hanging the health route.
  const valkey = new Redis(config.valkeyUrl, { commandTimeout: TIMEOUT_MS });
  valkey.on('error', () => {});

  // The emulator ignores credentials but the SDK refuses to sign without some; real AWS uses the role.
  const sqs = new SQSClient({ endpoint: config.sqsEndpoint, region: config.sqsRegion });
  const ticksQueueUrl = `${config.sqsEndpoint.replace(/\/$/, '')}/000000000000/${config.ticksQueueName}`;

  const healthChecks: HealthChecks = {
    postgres: async () => {
      await pool.query('select 1');
    },
    valkey: async () => {
      await valkey.ping();
    },
    queue: async () => {
      await sqs.send(new GetQueueAttributesCommand({ QueueUrl: ticksQueueUrl }), {
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      });
    },
  };

  return {
    pool,
    valkey,
    sqs,
    ticksQueueUrl,
    healthChecks,
    close: async () => {
      valkey.disconnect();
      sqs.destroy();
      await Promise.allSettled([pool.end()]);
    },
  };
}
