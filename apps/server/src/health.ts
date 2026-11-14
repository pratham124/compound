import type { DependencyStatus, HealthResponse } from '@compound/contracts';

export type HealthCheck = () => Promise<void>;

export type HealthChecks = {
  postgres: HealthCheck;
  valkey: HealthCheck;
  queue: HealthCheck;
};

async function statusOf(check: HealthCheck): Promise<DependencyStatus> {
  try {
    await check();

    return 'up';
  } catch {
    return 'down';
  }
}

export async function checkHealth(checks: HealthChecks): Promise<HealthResponse> {
  const [postgres, valkey, queue] = await Promise.all([
    statusOf(checks.postgres),
    statusOf(checks.valkey),
    statusOf(checks.queue),
  ]);

  const allUp = postgres === 'up' && valkey === 'up' && queue === 'up';

  return { status: allUp ? 'ok' : 'degraded', checks: { postgres, valkey, queue } };
}
