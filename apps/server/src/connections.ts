import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Redis } from 'ioredis';
import pg from 'pg';

import type { Config } from './config.ts';
import type { HealthChecks } from './health.ts';

const TIMEOUT_MS = 2000;

const OWNER_POOL_MAX = 2;
const AUTH_POOL_MAX = 3;

type PoolSizes = { owner: number; auth: number; api: number };

/**
 * Splits the process's connection budget (`DATABASE_POOL_MAX`) across its three pools. Migrations and health checks
 * need few connections and sign-in is occasional, so those two stay fixed and the api pool, which carries the
 * traffic, gets the rest.
 */
function poolSizes(total: number): PoolSizes {
  return { owner: OWNER_POOL_MAX, auth: AUTH_POOL_MAX, api: total - OWNER_POOL_MAX - AUTH_POOL_MAX };
}

export type Connections = {
  pool: pg.Pool;
  /** What better-auth uses: the compound_auth role, which is the only one that may reach the accounts table. */
  authPool: pg.Pool;
  /** Pipelined connections for per-person queries under row-level security; see withUser. */
  apiPool: pg.Pool;
  valkey: Redis;
  sqs: SQSClient;
  ticksQueueUrl: string;
  healthChecks: HealthChecks;
  close: () => Promise<void>;
};

export type ApiPoolOptions = { databaseUrl: string; timeoutMs: number; max: number };

/**
 * Connections for per-person queries (see withUser). Postgres cancels a statement at three quarters of the
 * client's timeout, so a slow query ends with an error and the connection survives; the client's own timeout,
 * which in pipeline mode destroys the connection, is only the backstop.
 */
export function createApiPool({ databaseUrl, timeoutMs, max }: ApiPoolOptions): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
    options: `-c statement_timeout=${Math.floor(timeoutMs * 0.75)}`,
    pipeline: true,
    max,
  });

  pool.on('error', () => {});

  return pool;
}

export function connect(config: Config): Connections {
  const sizes = poolSizes(config.databasePoolMax);

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: sizes.owner,
    connectionTimeoutMillis: TIMEOUT_MS,
    query_timeout: TIMEOUT_MS,
  });

  const authPool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: sizes.auth,
    connectionTimeoutMillis: TIMEOUT_MS,
    query_timeout: TIMEOUT_MS,
    options: '-c role=compound_auth',
  });

  authPool.on('error', () => {});

  const apiPool = createApiPool({ databaseUrl: config.databaseUrl, timeoutMs: TIMEOUT_MS, max: sizes.api });

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
    authPool,
    apiPool,
    valkey,
    sqs,
    ticksQueueUrl,
    healthChecks,
    close: async () => {
      valkey.disconnect();
      sqs.destroy();
      await Promise.allSettled([pool.end(), authPool.end(), apiPool.end()]);
    },
  };
}
