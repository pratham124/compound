import type { HealthResponse } from '@compound/contracts';
import { ZodError } from 'zod';

import { fetchHealth } from './health.ts';

export type ServerStatus =
  | { kind: 'loading' }
  | { kind: 'not-configured' }
  | { kind: 'unreachable' }
  | { kind: 'invalid' }
  | { kind: 'ready'; health: HealthResponse };

export type LoadServerStatusOptions = {
  baseUrl: string | undefined;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
};

export async function loadServerStatus({
  baseUrl,
  fetch,
  timeoutMs,
}: LoadServerStatusOptions): Promise<Exclude<ServerStatus, { kind: 'loading' }>> {
  if (baseUrl === undefined || baseUrl === '') {
    return { kind: 'not-configured' };
  }

  // A wrong LAN address otherwise leaves iOS waiting for its own, much longer, timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const health = await fetchHealth({
      baseUrl,
      fetch: (input, init) => fetch(input, { ...init, signal: controller.signal }),
    });

    return { kind: 'ready', health };
  } catch (error) {
    return error instanceof ZodError || error instanceof SyntaxError ? { kind: 'invalid' } : { kind: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
